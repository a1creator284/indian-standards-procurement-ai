import type { Requirement } from '../types';
import { buildExtractionPrompt, buildRerankPrompt, buildTranslationPrompt, GROUNDING_SYSTEM } from './prompts';
import { normalizeExtracted } from './normalizeExtracted';
import {
  AIProviderError,
  parseJsonLoose,
  type EmbeddingProvider,
  type GenerateOptions,
  type LLMProvider,
  type RerankCandidate,
  type RerankResult,
} from './types';

/**
 * OpenAI-compatible provider using the REST API directly (no extra SDK dependency).
 * Server-side only.
 */
export class OpenAILLMProvider implements LLMProvider {
  readonly name: string;
  readonly isLive = true;

  constructor(
    private readonly apiKey: string,
    private readonly model = 'gpt-4o-mini',
    private readonly baseUrl = 'https://api.openai.com/v1',
  ) {
    if (!apiKey) throw new AIProviderError('OPENAI_API_KEY is not set', 'missing-key');
    this.name = `openai:${model}`;
  }

  async generate(opts: GenerateOptions): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({
        model: this.model,
        max_tokens: opts.maxTokens ?? 2000,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.user },
        ],
        ...(opts.json ? { response_format: { type: 'json_object' } } : {}),
      }),
    }).catch(() => {
      throw new AIProviderError('Could not reach the OpenAI API', 'unavailable');
    });
    if (res.status === 401) throw new AIProviderError('OpenAI API key was rejected', 'missing-key');
    if (res.status === 429) throw new AIProviderError('OpenAI rate limit reached', 'rate-limit');
    if (!res.ok) throw new AIProviderError(`OpenAI API error (${res.status})`, 'unavailable');
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content?.trim() ?? '';
  }

  async rerank(query: string, requirements: Requirement[], candidates: RerankCandidate[]): Promise<RerankResult[]> {
    // json_object mode requires an object wrapper, so ask for {"results": [...]}.
    const raw = await this.generate({
      system: GROUNDING_SYSTEM,
      user: buildRerankPrompt(query, requirements, candidates) + '\nWrap the array as {"results": [...]}.',
      json: true,
    });
    const parsed = parseJsonLoose<{ results?: Array<{ standardId: string; score: number; reasons?: string[] }> } | Array<{ standardId: string; score: number; reasons?: string[] }>>(raw);
    const list = Array.isArray(parsed) ? parsed : (parsed.results ?? []);
    const known = new Set(candidates.map((c) => c.standard.id));
    return list
      .filter((p) => known.has(p.standardId))
      .map((p) => ({ standardId: p.standardId, score: Math.max(0, Math.min(1, Number(p.score) || 0)), reasons: (p.reasons ?? []).slice(0, 3) }));
  }

  async extractRequirements(text: string): Promise<Requirement[]> {
    const raw = await this.generate({
      system: GROUNDING_SYSTEM,
      user: buildExtractionPrompt(text) + '\nWrap the array as {"requirements": [...]}.',
      json: true,
    });
    const parsed = parseJsonLoose<{ requirements?: unknown } | unknown[]>(raw);
    return normalizeExtracted(Array.isArray(parsed) ? parsed : parsed.requirements);
  }

  async translate(text: string, sourceLanguage: string): Promise<string> {
    return this.generate({ system: GROUNDING_SYSTEM, user: buildTranslationPrompt(text, sourceLanguage) });
  }
}


export class VoyageEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'voyage';
  readonly dimensions: number;

  constructor(
    private readonly apiKey: string,
    readonly model = 'voyage-3-lite',
  ) {
    if (!apiKey) throw new AIProviderError('VOYAGE_API_KEY is not set', 'missing-key');
    this.dimensions = model.includes('lite') ? 512 : 1024;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const res = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts }),
    }).catch(() => {
      throw new AIProviderError('Could not reach the Voyage API', 'unavailable');
    });
    if (res.status === 429) throw new AIProviderError('Voyage rate limit reached', 'rate-limit');
    if (!res.ok) throw new AIProviderError(`Voyage embeddings error (${res.status})`, 'unavailable');
    const data = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> };
    return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'openai';
  readonly dimensions: number;

  constructor(
    private readonly apiKey: string,
    readonly model = 'text-embedding-3-small',
  ) {
    if (!apiKey) throw new AIProviderError('OPENAI_API_KEY is not set', 'missing-key');
    this.dimensions = model.includes('large') ? 3072 : 1536;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts }),
    }).catch(() => {
      throw new AIProviderError('Could not reach the OpenAI API', 'unavailable');
    });
    if (res.status === 429) throw new AIProviderError('OpenAI rate limit reached', 'rate-limit');
    if (!res.ok) throw new AIProviderError(`OpenAI embeddings error (${res.status})`, 'unavailable');
    const data = (await res.json()) as { data: Array<{ index: number; embedding: number[] }> };
    return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}

