import type { AnalysisResult, ChatCitation, ChatMessage, Recommendation, Standard } from '../types';
import type { AIProviders } from '../providers/types';
import type { StandardsRepository } from '../repository/types';
import { GROUNDING_SYSTEM } from '../providers/prompts';
import { RELATIONSHIP_LABELS } from '../graph/expand';
import { extractStandardReferences, keyFromStandardNumber } from '../extraction/references';
import { APPLICABILITY_LABELS, NO_CERTIFICATION_MESSAGE } from '../analysis/certifications';
import { retrieveCandidates } from '../retrieval/retrieve';

export interface ChatRequest {
  question: string;
  analysis?: AnalysisResult | null;
  history?: ChatMessage[];
}

type Intent = 'why' | 'related' | 'missing' | 'outdated' | 'testing' | 'connected' | 'certification' | 'search';

function detectIntent(q: string): Intent {
  const l = q.toLowerCase();
  if (/\b(why|kyun|kyon|क्यों|reason|recommend)/.test(l)) return 'why';
  if (/\b(missing|gap|incomplete|lack|kami|कमी|absent)/.test(l)) return 'missing';
  if (/\b(outdated|old|superseded|purana|पुराना|current|latest|edition|version|amend)/.test(l)) return 'outdated';
  if (/\b(test|testing|jaanch|परीक्षण|measure)/.test(l)) return 'testing';
  if (/\b(certif|isi|crs|bis mark|hallmark|प्रमाण)/.test(l)) return 'certification';
  if (/\b(connect|linked|link|graph|relationship|reference)/.test(l)) return 'connected';
  if (/\b(related|allied|also consider|other standard|aur kaun|और)/.test(l)) return 'related';
  return 'search';
}

/** Resolves a standard mentioned in the question, defaulting to the top recommendation. */
function resolveStandard(question: string, analysis: AnalysisResult | null | undefined): Recommendation | null {
  if (!analysis) return null;
  const all = [...analysis.recommendations, ...analysis.related];
  const refs = extractStandardReferences(question);
  for (const ref of refs) {
    const hit = all.find((r) => keyFromStandardNumber(r.standard.number) === ref.key || keyFromStandardNumber(r.standard.number).startsWith(`${ref.key.split('|')[0]}|`));
    if (hit) return hit;
  }
  return analysis.recommendations[0] ?? null;
}

const cite = (s: Standard, snippet: string): ChatCitation => ({ standardId: s.id, standardNumber: s.number, snippet });

/**
 * Answers questions from retrieved evidence. Demo mode uses intent templates
 * grounded in the analysis; a live LLM receives the same evidence as context and
 * is instructed not to go beyond it.
 */
export async function answerQuestion(req: ChatRequest, deps: { repo: StandardsRepository; ai: AIProviders }): Promise<ChatMessage> {
  const { question, analysis } = req;
  const intent = detectIntent(question);
  const target = resolveStandard(question, analysis);
  const citations: ChatCitation[] = [];
  let answer: string;
  const suffix = '\n\n_Answer grounded in indexed metadata; verify with BIS before procurement use._';

  if (!analysis && intent !== 'search') {
    answer = 'Run an analysis first so I can answer from its retrieved evidence. You can also ask me to search the indexed standards, e.g. "standards for XLPE cables".';
  } else if (intent === 'why' && target) {
    const s = target.standard;
    answer = `**${s.number}** was recommended with ${target.confidence.band.replace('-', ' ')} AI confidence (${target.confidence.total}/100).\n\n${target.explanation}\n\n**Reasons:**\n${target.reasons.map((r) => `- ${r}`).join('\n')}`;
    for (const e of target.evidence.slice(0, 3)) citations.push(cite(s, e.snippet));
  } else if (intent === 'related' && target) {
    const s = target.standard;
    const groups = new Map<string, string[]>();
    for (const r of target.relationships) {
      const label = RELATIONSHIP_LABELS[r.type];
      groups.set(label, [...(groups.get(label) ?? []), `${r.standard.number} — ${r.standard.title}`]);
      citations.push(cite(r.standard, r.note ?? `${label} of ${s.number}`));
    }
    answer = groups.size
      ? `Standards connected to **${s.number}** in the indexed relationship graph:\n\n${[...groups.entries()].map(([k, v]) => `**${k}**\n${v.map((x) => `- ${x}`).join('\n')}`).join('\n\n')}`
      : `No related standards are indexed for ${s.number}.`;
  } else if (intent === 'missing' && analysis) {
    answer = analysis.gaps.length
      ? `Potential gaps identified in the input:\n\n${analysis.gaps.map((g) => `- **${g.issue}** (${g.severity}) — ${g.suggestedAction}`).join('\n')}`
      : 'No potential gaps were flagged for this input.';
    for (const g of analysis.gaps.slice(0, 4)) {
      const s = [...analysis.recommendations, ...analysis.related].find((r) => g.relatedStandardIds.includes(r.standard.id));
      if (s) citations.push(cite(s.standard, g.evidence));
    }
  } else if (intent === 'outdated' && analysis) {
    const flagged = analysis.outdated.filter((o) => o.status !== 'matches-indexed');
    answer = analysis.outdated.length
      ? `Reference check against the indexed dataset:\n\n${analysis.outdated.map((o) => `- **${o.referenceText}** — ${o.status.replace(/-/g, ' ')}. ${o.evidence} ${o.recommendedAction}`).join('\n')}`
      : target
        ? `No standard references were found in the input to compare. For **${target.standard.number}**, the latest indexed edition is ${target.standard.latestVersion.label} (${target.freshness.note}).`
        : 'No standard references were found in the input.';
    for (const o of flagged.slice(0, 4)) {
      const s = [...analysis.recommendations, ...analysis.related].find((r) => r.standard.id === o.standardId);
      if (s) citations.push(cite(s.standard, o.evidence));
    }
  } else if (intent === 'testing' && target) {
    const tests = target.relationships.filter((r) => r.type === 'test_method');
    answer = tests.length
      ? `Test-method standards linked to **${target.standard.number}** in the index:\n\n${tests.map((t) => `- ${t.standard.number} — ${t.standard.title}${t.note ? ` (${t.note})` : ''}`).join('\n')}`
      : `No test-method relationship is indexed for ${target.standard.number}. Consider checking the standard's own test clauses.`;
    for (const t of tests) citations.push(cite(t.standard, t.standard.scope.slice(0, 160)));
  } else if (intent === 'certification' && analysis) {
    const certs = analysis.certifications.filter((c) => !target || c.standardId === target.standard.id || analysis.recommendations.some((r) => r.standard.id === c.standardId));
    answer = certs.length
      ? `Indexed certification mappings:\n\n${certs.map((c) => `- **${c.standardNumber}** → ${c.certification.name}: ${APPLICABILITY_LABELS[c.applicability]}. ${c.evidence}`).join('\n')}`
      : NO_CERTIFICATION_MESSAGE;
    for (const c of certs.slice(0, 4)) {
      const s = [...analysis.recommendations, ...analysis.related].find((r) => r.standard.id === c.standardId);
      if (s) citations.push(cite(s.standard, c.evidence));
    }
  } else if (intent === 'connected' && target) {
    answer = target.relationships.length
      ? `**${target.standard.number}** is connected to ${target.relationships.length} indexed standard(s):\n\n${target.relationships.map((r) => `- ${RELATIONSHIP_LABELS[r.type]}: ${r.standard.number} — ${r.standard.title}`).join('\n')}`
      : `No relationships are indexed for ${target.standard.number}.`;
    for (const r of target.relationships.slice(0, 5)) citations.push(cite(r.standard, r.note ?? RELATIONSHIP_LABELS[r.type]));
  } else {
    // Free search over the index using the same retrieval stack
    const { candidates } = await retrieveCandidates(question, deps.repo, deps.ai.embeddings, { topK: 5 });
    const good = candidates.filter((c) => c.semanticScore > 0.15);
    answer = good.length
      ? `Closest indexed standards for your question:\n\n${good.map((c) => `- **${c.standard.number}** — ${c.standard.title} (similarity ${(c.semanticScore * 100).toFixed(0)}%)`).join('\n')}`
      : 'I could not find a closely matching standard in the indexed dataset. Try describing the product, its sector and key ratings.';
    for (const c of good) citations.push(cite(c.standard, c.standard.scope.slice(0, 160)));
  }

  if (deps.ai.llm.isLive && analysis) {
    try {
      const evidence = citations.map((c) => `- ${c.standardNumber}: ${c.snippet}`).join('\n') || '(no evidence retrieved)';
      const refined = await deps.ai.llm.generate({
        system: GROUNDING_SYSTEM,
        user:
          `Question: ${question}\n\nDraft answer (grounded, may be used as-is):\n${answer}\n\nRetrieved evidence:\n${evidence}\n\n` +
          'Improve the draft into a concise, helpful answer in the same language as the question. Do not introduce standards or claims not present in the draft/evidence. Use markdown.',
        maxTokens: 1200,
      });
      if (refined.trim()) answer = refined.trim();
    } catch {
      /* keep grounded draft */
    }
  }

  return { role: 'assistant', content: answer + suffix, citations: dedupeCitations(citations), createdAt: new Date().toISOString() };
}

function dedupeCitations(list: ChatCitation[]): ChatCitation[] {
  const seen = new Set<string>();
  return list.filter((c) => {
    const k = `${c.standardId}|${c.snippet}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
