import Anthropic from '@anthropic-ai/sdk';
import type { Requirement } from '../types';
import { buildExtractionPrompt, buildRerankPrompt, buildTranslationPrompt, GROUNDING_SYSTEM } from './prompts';
import {
  AIProviderError,
  parseJsonLoose,
  type GenerateOptions,
  type LLMProvider,
  type RerankCandidate,
  type RerankResult,
} from './types';
import { normalizeExtracted } from './normalizeExtracted';

/** Server-side only. Never import from browser code. */
export class AnthropicLLMProvider implements LLMProvider {
  readonly name: string;
  readonly isLive = true;
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model = 'claude-opus-5') {
    if (!apiKey) throw new AIProviderError('ANTHROPIC_API_KEY is not set', 'missing-key');
    this.client = new Anthropic({ apiKey, maxRetries: 2, timeout: 60_000 });
    this.model = model;
    this.name = `anthropic:${model}`;
  }

  async generate(opts: GenerateOptions): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: opts.maxTokens ?? 4000,
        system: opts.system,
        output_config: { effort: 'low' },
        messages: [{ role: 'user', content: opts.user }],
      });
      if (response.stop_reason === 'refusal') {
        throw new AIProviderError('The model declined to answer this request.', 'bad-response');
      }
      return response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim();
    } catch (error) {
      throw mapError(error);
    }
  }

  async rerank(query: string, requirements: Requirement[], candidates: RerankCandidate[]): Promise<RerankResult[]> {
    const raw = await this.generate({
      system: GROUNDING_SYSTEM,
      user: buildRerankPrompt(query, requirements, candidates),
      maxTokens: 4000,
      json: true,
    });
    const parsed = parseJsonLoose<Array<{ standardId: string; score: number; reasons?: string[] }>>(raw);
    const known = new Set(candidates.map((c) => c.standard.id));
    return parsed
      .filter((p) => known.has(p.standardId))
      .map((p) => ({ standardId: p.standardId, score: clamp01(p.score), reasons: (p.reasons ?? []).slice(0, 3) }));
  }

  async extractRequirements(text: string): Promise<Requirement[]> {
    const raw = await this.generate({ system: GROUNDING_SYSTEM, user: buildExtractionPrompt(text), maxTokens: 4000, json: true });
    return normalizeExtracted(parseJsonLoose(raw));
  }

  async translate(text: string, sourceLanguage: string): Promise<string> {
    return this.generate({ system: GROUNDING_SYSTEM, user: buildTranslationPrompt(text, sourceLanguage), maxTokens: 2000 });
  }
}

function mapError(error: unknown): AIProviderError {
  if (error instanceof AIProviderError) return error;
  if (error instanceof Anthropic.AuthenticationError) return new AIProviderError('Anthropic API key was rejected', 'missing-key');
  if (error instanceof Anthropic.RateLimitError) return new AIProviderError('Anthropic rate limit reached', 'rate-limit');
  if (error instanceof Anthropic.APIConnectionError) return new AIProviderError('Could not reach the Anthropic API', 'unavailable');
  if (error instanceof Anthropic.APIError) return new AIProviderError(`Anthropic API error (${error.status})`, 'unavailable');
  return new AIProviderError('Unexpected AI provider failure', 'unknown');
}

function clamp01(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? n : 0;
  return Math.max(0, Math.min(1, v));
}
