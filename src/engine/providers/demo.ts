import type { Requirement } from '../types';
import { normalizeQuery, matchConcepts } from '../language/detect';
import { contentTokens } from '../text/clean';
import { AIProviderError, type LLMProvider, type RerankCandidate, type RerankResult } from './types';

/**
 * Demo LLM provider — works with no credentials.
 * Reranking is a deterministic blend of semantic similarity, lexical overlap and
 * shared domain concepts. Generation is not available (callers fall back to templates).
 */
export class DemoLLMProvider implements LLMProvider {
  readonly name = 'demo-local';
  readonly isLive = false;

  async generate(): Promise<string> {
    throw new AIProviderError('Generation requires a live LLM provider (demo mode uses templates).', 'unavailable');
  }

  async rerank(query: string, requirements: Requirement[], candidates: RerankCandidate[]): Promise<RerankResult[]> {
    const qTokens = new Set(contentTokens(query));
    const qConcepts = new Set(matchConcepts(query).map((c) => c.id));
    const reqText = requirements.map((r) => `${r.entity ?? ''} ${r.value ?? ''} ${r.text}`).join(' ');
    const rTokens = new Set(contentTokens(reqText));

    return candidates.map(({ standard, semanticScore }) => {
      const docText = `${standard.title} ${standard.scope} ${standard.keywords.join(' ')} ${standard.productTypes.join(' ')}`;
      const dTokens = new Set(contentTokens(docText));
      const dConcepts = new Set(matchConcepts(docText).map((c) => c.id));

      const lexical = jaccardOverlap(qTokens, dTokens);
      const reqOverlap = jaccardOverlap(rTokens, dTokens);
      const sharedConcepts = [...qConcepts].filter((c) => dConcepts.has(c));
      const conceptScore = qConcepts.size ? sharedConcepts.length / qConcepts.size : 0;
      const productHit = standard.productTypes.some((p) => query.toLowerCase().includes(p.toLowerCase().split(' ')[0]));

      const score = clamp(0.5 * semanticScore + 0.2 * conceptScore + 0.15 * lexical + 0.1 * reqOverlap + (productHit ? 0.05 : 0));
      const reasons: string[] = [];
      if (sharedConcepts.length) reasons.push(`Shares domain concepts: ${sharedConcepts.slice(0, 4).join(', ')}`);
      if (productHit) reasons.push('Product type in indexed metadata matches the input');
      if (lexical > 0.05) reasons.push('Lexical overlap between input and indexed scope/keywords');
      return { standardId: standard.id, score, reasons };
    });
  }

  async extractRequirements(): Promise<Requirement[]> {
    return []; // rule-based extraction in the pipeline covers demo mode
  }

  async translate(text: string): Promise<string> {
    return normalizeQuery(text).normalized;
  }
}

function jaccardOverlap(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / Math.min(a.size, b.size);
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}
