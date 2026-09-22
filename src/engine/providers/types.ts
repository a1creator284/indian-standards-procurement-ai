import type { Requirement, Standard } from '../types';

/** Candidate handed to the reranker. */
export interface RerankCandidate {
  standard: Standard;
  semanticScore: number; // 0..1
}

export interface RerankResult {
  standardId: string;
  score: number; // 0..1 — provider's relevance judgement
  reasons: string[];
}

export interface GenerateOptions {
  system: string;
  user: string;
  maxTokens?: number;
  json?: boolean;
}

/**
 * LLM port. Every method is optional to *succeed*: implementations may throw an
 * `AIProviderError`, and the pipeline degrades gracefully to local logic.
 */
export interface LLMProvider {
  readonly name: string;
  readonly isLive: boolean;
  generate(opts: GenerateOptions): Promise<string>;
  rerank(query: string, requirements: Requirement[], candidates: RerankCandidate[]): Promise<RerankResult[]>;
  extractRequirements(text: string): Promise<Requirement[]>;
  translate(text: string, sourceLanguage: string): Promise<string>;
}

export interface EmbeddingProvider {
  readonly name: string;
  readonly model: string;
  readonly dimensions: number;
  embed(texts: string[]): Promise<number[][]>;
}

export interface AIProviders {
  llm: LLMProvider;
  embeddings: EmbeddingProvider;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: 'missing-key' | 'rate-limit' | 'unavailable' | 'bad-response' | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

/** Extracts the first JSON object/array from an LLM response (tolerates code fences). */
export function parseJsonLoose<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced ? fenced[1] : raw).trim();
  const start = Math.min(...['{', '['].map((c) => body.indexOf(c)).filter((i) => i >= 0));
  if (!Number.isFinite(start)) throw new AIProviderError('No JSON found in model response', 'bad-response');
  const endObj = body.lastIndexOf('}');
  const endArr = body.lastIndexOf(']');
  const end = Math.max(endObj, endArr);
  try {
    return JSON.parse(body.slice(start, end + 1)) as T;
  } catch {
    throw new AIProviderError('Model response was not valid JSON', 'bad-response');
  }
}
