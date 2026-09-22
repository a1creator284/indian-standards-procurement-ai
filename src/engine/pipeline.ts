import { AI_DISCLAIMER, type AnalysisResult, type InputSource, type Recommendation, type ExpandedRelationship } from './types';
import type { AIProviders } from './providers/types';
import type { StandardsRepository } from './repository/types';
import { cleanText } from './text/clean';
import { normalizeQuery } from './language/detect';
import { extractRequirements, mergeRequirements } from './extraction/requirements';
import { retrieveCandidates } from './retrieval/retrieve';
import { rerankCandidates } from './ranking/rerank';
import { expandRelationships, buildKnowledgeGraph } from './graph/expand';
import { findCertifications } from './analysis/certifications';
import { detectOutdatedReferences } from './analysis/outdated';
import { analyzeGaps } from './analysis/gaps';
import { buildExplanation, buildFreshness } from './analysis/explain';
import { computeConfidence } from './ranking/confidence';
import { matchRequirements } from './ranking/rerank';

export interface AnalyzeRequest {
  text: string;
  source?: InputSource;
  fileName?: string;
  topK?: number;
}

export interface EngineDeps {
  repo: StandardsRepository;
  ai: AIProviders;
}

/** Minimum confidence for a candidate to be presented as a primary recommendation. */
const PRIMARY_THRESHOLD = 45;
const MAX_PRIMARY = 6;

/**
 * Full analysis pipeline:
 * clean → language normalise → requirement extraction → chunk/embed → vector retrieval →
 * rerank → relationship expansion → evidence → confidence → certifications → outdated →
 * gaps → graph → report.
 */
export async function analyze(req: AnalyzeRequest, deps: EngineDeps): Promise<AnalysisResult> {
  const timings: Record<string, number> = {};
  const t = (label: string, start: number) => (timings[label] = Math.round(performance.now() - start));
  const { repo, ai } = deps;
  const source = req.source ?? 'text';

  // 1. Clean + language
  let t0 = performance.now();
  const original = cleanText(req.text);
  const lang = normalizeQuery(original);
  let normalized = lang.normalized;
  let translationNote = lang.note;
  if (ai.llm.isLive && lang.language !== 'en' && original.length < 4000) {
    try {
      normalized = cleanText(await ai.llm.translate(original, lang.language === 'hi' ? 'Hindi' : 'Hinglish'));
      translationNote = `${lang.language === 'hi' ? 'Hindi' : 'Hinglish'} input translated by ${ai.llm.name}; original preserved.`;
    } catch {
      /* keep lexicon normalisation */
    }
  }
  t('language', t0);

  // 2. Requirements (rules + optional LLM)
  t0 = performance.now();
  let requirements = extractRequirements(`${original}\n${normalized}`);
  if (ai.llm.isLive) {
    try {
      requirements = mergeRequirements(requirements, await ai.llm.extractRequirements(normalized));
    } catch (err) {
      console.warn('Live LLM requirement extraction failed, fell back to rules:', err);
    }
  }
  t('requirements', t0);

  // 3. Retrieval
  t0 = performance.now();
  const retrievalText = source === 'text' ? normalized : `${normalized.slice(0, 6000)}`;
  const { candidates, sectors } = await retrieveCandidates(retrievalText, repo, ai.embeddings, { topK: req.topK ?? 12 });
  t('retrieval', t0);

  // 4. Rerank
  t0 = performance.now();
  const candidateRels = await repo.getRelationshipsFor(candidates.map((c) => c.standard.id));
  const { ranked, rerankUsed } = await rerankCandidates(candidates, { query: normalized, requirements, sectors, relationships: candidateRels }, ai.llm);
  t('rerank', t0);

  // 5. Primary selection + expansion
  t0 = performance.now();
  let primaries = ranked.filter((r) => r.confidence.total >= PRIMARY_THRESHOLD && r.standard.revisionStatus !== 'superseded').slice(0, MAX_PRIMARY);
  if (!primaries.length && ranked.length && ranked[0].confidence.total >= 25) primaries = ranked.slice(0, 1);
  const { byStandard, related: relatedMap } = await expandRelationships(primaries.map((p) => p.standard), repo);
  const allStandards = [...primaries.map((p) => p.standard), ...relatedMap.values()];
  const certifications = await findCertifications(allStandards, repo);
  t('expansion', t0);

  // 6. Recommendations with explanations
  t0 = performance.now();
  const recommendations: Recommendation[] = primaries.map((p) => {
    const rels = byStandard.get(p.standard.id) ?? [];
    const { explanation, reasons } = buildExplanation(p, requirements, rels, certifications);
    return {
      standard: p.standard,
      role: 'primary',
      confidence: p.confidence,
      reasons,
      explanation,
      matchedRequirementIds: p.matchedRequirementIds,
      relationships: rels,
      certifications: certifications.filter((c) => c.standardId === p.standard.id),
      evidence: p.evidence,
      freshness: buildFreshness(p.standard),
    };
  });

  const primaryIds = new Set(primaries.map((p) => p.standard.id));
  const relatedRecs: Recommendation[] = [...relatedMap.values()]
    .map((s): Recommendation => {
      const viaTypes = new Set<string>();
      const via: ExpandedRelationship[] = [];
      for (const [pid, rels] of byStandard) {
        for (const r of rels) if (r.standard.id === s.id) {
          viaTypes.add(r.type);
          via.push({ type: r.type, standard: primaries.find((p) => p.standard.id === pid)!.standard, note: r.note, direction: r.direction === 'outgoing' ? 'incoming' : 'outgoing' });
        }
      }
      const rankedHit = ranked.find((r) => r.standard.id === s.id);
      const { matched, evidence } = matchRequirements(s, requirements, normalized);
      const confidence =
        rankedHit?.confidence ??
        computeConfidence({ semantic: 0.35, metadata: 0.3, category: sectors.slice(0, 2).includes(s.sector) ? 1 : 0.4, coverage: matched.length / Math.max(1, Math.min(requirements.length, 8)), relationship: Math.min(1, via.length / 2), evidence: Math.min(1, evidence.length / 3) });
      const relTypes = [...viaTypes].join(', ').replace(/_/g, ' ');
      return {
        standard: s,
        role: 'related',
        confidence,
        reasons: [`Linked to ${via.map((v) => v.standard.number).slice(0, 3).join(', ')} as ${relTypes}`],
        explanation: `Included because the indexed relationship graph links ${s.number} (${s.title}) to a primary recommendation as ${relTypes}. Verify applicability against the authoritative source.`,
        matchedRequirementIds: matched.map((m) => m.id),
        relationships: via,
        certifications: certifications.filter((c) => c.standardId === s.id),
        evidence,
        freshness: buildFreshness(s),
      };
    })
    .filter((r) => !primaryIds.has(r.standard.id))
    .sort((a, b) => b.confidence.total - a.confidence.total);
  t('explain', t0);

  // 7. Outdated + gaps + graph
  t0 = performance.now();
  const outdated = detectOutdatedReferences(original, await repo.allStandards(), await repo.getRelationshipsFor([...primaryIds, ...relatedMap.keys()]));
  const gaps = analyzeGaps({
    source,
    text: original,
    requirements,
    primaries: primaries.map((p) => p.standard),
    expansions: byStandard,
    certifications: certifications.filter((c) => primaryIds.has(c.standardId)),
    outdated,
    sectors,
  });
  const productDescription = describeProduct(requirements, original);
  const graph = buildKnowledgeGraph(productDescription, primaries.map((p) => p.standard), byStandard, certifications);
  t('analysis', t0);

  const top = recommendations[0];
  const headline = top
    ? `${recommendations.length} potentially applicable standard${recommendations.length > 1 ? 's' : ''} identified; top match ${top.standard.number} (${top.confidence.band.replace('-', ' ')} confidence).`
    : 'No standard in the indexed dataset matched the input with sufficient confidence.';

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    input: { original, normalized, language: lang.language, source, fileName: req.fileName, translationNote },
    requirements,
    recommendations,
    related: relatedRecs,
    certifications,
    gaps,
    outdated,
    graph,
    summary: {
      productDescription,
      requirementCount: requirements.length,
      primaryCount: recommendations.length,
      relatedCount: relatedRecs.length,
      gapCount: gaps.length,
      outdatedCount: outdated.filter((o) => o.status === 'potentially-outdated' || o.status === 'superseded').length,
      certificationCount: certifications.filter((c) => primaryIds.has(c.standardId)).length,
      headline,
    },
    provider: {
      mode: ai.llm.isLive ? 'live' : 'demo',
      llm: rerankUsed,
      embeddings: `${ai.embeddings.name}:${ai.embeddings.model}`,
      repository: repo.name,
    },
    disclaimer: AI_DISCLAIMER,
    timingsMs: timings,
  };
}

function describeProduct(requirements: AnalysisResult['requirements'], original: string): string {
  const products = requirements.filter((r) => r.category === 'product').map((r) => r.text.replace(/^Product: /, ''));
  if (products.length) return products[0];
  const firstLine = original.split('\n')[0].trim();
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine || 'Procurement item';
}
