import type { Evidence, Requirement, Standard, StandardRelationship, Sector } from '../types';
import type { LLMProvider, RerankResult } from '../providers/types';
import type { RetrievedCandidate } from '../retrieval/retrieve';
import { matchConcepts } from '../language/detect';
import { contentTokens } from '../text/clean';
import { computeConfidence } from './confidence';
import type { ConfidenceBreakdown } from '../types';

export interface RankedCandidate {
  standard: Standard;
  confidence: ConfidenceBreakdown;
  matchedRequirementIds: string[];
  providerReasons: string[];
  evidence: Evidence[];
  semanticScore: number;
  rerankScore: number | null;
}

export interface RerankContext {
  query: string;
  requirements: Requirement[];
  sectors: Sector[];
  relationships: StandardRelationship[]; // among candidate ids
}

/**
 * Reranks retrieval candidates. The LLM (or demo) provider supplies a relevance
 * judgement; the transparent confidence model blends it with metadata, coverage,
 * graph connectivity and evidence strength.
 */
export async function rerankCandidates(
  candidates: RetrievedCandidate[],
  ctx: RerankContext,
  llm: LLMProvider,
): Promise<{ ranked: RankedCandidate[]; rerankUsed: string; rerankFailed: boolean }> {
  let providerResults: RerankResult[] = [];
  let rerankFailed = false;
  let rerankUsed = llm.name;
  try {
    providerResults = await llm.rerank(
      ctx.query,
      ctx.requirements,
      candidates.map((c) => ({ standard: c.standard, semanticScore: c.semanticScore })),
    );
  } catch {
    rerankFailed = true;
    rerankUsed = 'retrieval-only';
  }
  const byId = new Map(providerResults.map((r) => [r.standardId, r]));
  const candidateIds = new Set(candidates.map((c) => c.standard.id));
  const degree = new Map<string, number>();
  for (const r of ctx.relationships) {
    if (candidateIds.has(r.from) && candidateIds.has(r.to)) {
      degree.set(r.from, (degree.get(r.from) ?? 0) + 1);
      degree.set(r.to, (degree.get(r.to) ?? 0) + 1);
    }
  }
  const maxDegree = Math.max(1, ...degree.values());
  const queryConcepts = new Set(matchConcepts(ctx.query).map((c) => c.id));
  const primarySectors = new Set(ctx.sectors.slice(0, 2));

  const ranked = candidates.map((c): RankedCandidate => {
    const s = c.standard;
    const provider = byId.get(s.id);
    const rerankScore = provider ? provider.score : null;
    const semantic = rerankScore !== null ? 0.5 * c.semanticScore + 0.5 * rerankScore : c.semanticScore;

    const { matched, evidence } = matchRequirements(s, ctx.requirements, ctx.query);
    const coverage = ctx.requirements.length ? matched.length / Math.min(ctx.requirements.length, 8) : semantic;

    const docConcepts = new Set(matchConcepts(`${s.title} ${s.scope} ${s.keywords.join(' ')}`).map((x) => x.id));
    const sharedConcepts = [...queryConcepts].filter((x) => docConcepts.has(x)).length;
    const metadata = queryConcepts.size ? Math.min(1, sharedConcepts / Math.min(queryConcepts.size, 4)) : keywordOverlap(ctx.query, s);

    const category = primarySectors.has(s.sector) ? 1 : ctx.sectors.includes(s.sector) ? 0.6 : 0.2;
    const relationship = (degree.get(s.id) ?? 0) / maxDegree;
    const evidenceScore = Math.min(1, evidence.length / 3) * (evidence.length ? avg(evidence.map((e) => e.score)) : 0);

    const confidence = computeConfidence({ semantic, metadata, category, coverage: Math.min(1, coverage), relationship, evidence: evidenceScore });
    return {
      standard: s,
      confidence,
      matchedRequirementIds: matched.map((r) => r.id),
      providerReasons: provider?.reasons ?? [],
      evidence,
      semanticScore: c.semanticScore,
      rerankScore,
    };
  });

  ranked.sort((a, b) => b.confidence.total - a.confidence.total);
  return { ranked, rerankUsed, rerankFailed };
}

/** Finds which extracted requirements a standard's metadata addresses, producing evidence. */
export function matchRequirements(s: Standard, requirements: Requirement[], query: string): { matched: Requirement[]; evidence: Evidence[] } {
  const hay = `${s.title} ${s.scope} ${s.keywords.join(' ')} ${s.productTypes.join(' ')}`.toLowerCase();
  const docConcepts = new Set(matchConcepts(hay).map((c) => c.id));
  const matched: Requirement[] = [];
  const evidence: Evidence[] = [];
  let n = 0;

  for (const r of requirements) {
    const reqConcepts = matchConcepts(`${r.entity ?? ''} ${r.text}`).map((c) => c.id);
    const conceptHit = reqConcepts.some((c) => docConcepts.has(c));
    const tokens = contentTokens(`${r.entity ?? ''} ${r.value ?? ''}`).filter((t) => t.length > 2);
    const tokenHit = tokens.some((t) => hay.includes(t));
    if (conceptHit || tokenHit) {
      matched.push(r);
      const field = pickField(s, r);
      evidence.push({
        id: `ev-${s.id}-${++n}`,
        standardId: s.id,
        field: field.field,
        snippet: field.snippet,
        source: s.source,
        score: conceptHit ? 0.85 : 0.6,
      });
    }
  }

  if (!evidence.length) {
    const overlap = keywordOverlap(query, s);
    if (overlap > 0) {
      evidence.push({ id: `ev-${s.id}-title`, standardId: s.id, field: 'title', snippet: s.title, source: s.source, score: Math.min(0.7, 0.3 + overlap) });
    }
  }
  return { matched, evidence: dedupeEvidence(evidence).slice(0, 5) };
}

function pickField(s: Standard, r: Requirement): { field: Evidence['field']; snippet: string } {
  const needle = (r.entity ?? r.value ?? r.text).toLowerCase().split(' ')[0];
  const kw = s.keywords.find((k) => k.includes(needle) || needle.includes(k));
  if (kw) return { field: 'keywords', snippet: `Indexed keywords include "${kw}"` };
  const pt = s.productTypes.find((p) => p.includes(needle) || needle.includes(p));
  if (pt) return { field: 'productTypes', snippet: `Indexed product type "${pt}"` };
  const sentence = s.scope.split(/(?<=\.)\s+/).find((sent) => sent.toLowerCase().includes(needle));
  if (sentence) return { field: 'scope', snippet: sentence.trim() };
  return { field: 'scope', snippet: s.scope.slice(0, 160) + (s.scope.length > 160 ? '…' : '') };
}

function dedupeEvidence(list: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return list.filter((e) => {
    if (seen.has(e.snippet)) return false;
    seen.add(e.snippet);
    return true;
  });
}

function keywordOverlap(query: string, s: Standard): number {
  const q = new Set(contentTokens(query));
  const d = new Set(contentTokens(`${s.title} ${s.keywords.join(' ')} ${s.productTypes.join(' ')}`));
  if (!q.size) return 0;
  let inter = 0;
  for (const t of q) if (d.has(t)) inter++;
  return inter / Math.min(q.size, 6);
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / (nums.length || 1);
}
