import type { AIProviders, EmbeddingProvider, LLMProvider } from '../src/engine/providers/types';
import type { StandardsRepository } from '../src/engine/repository/types';
import { DemoLLMProvider } from '../src/engine/providers/demo';
import { LocalEmbeddingProvider } from '../src/engine/providers/localEmbedding';
import { MemoryStandardsRepository } from '../src/engine/repository/memoryRepository';
import { loadDemoDataset } from '../src/engine/repository/demoDataset';

/**
 * Server-side configuration. Reads environment variables ONCE and builds the
 * provider + repository singletons. Nothing here is ever sent to the browser
 * except the sanitised `status` summary.
 */
export interface ServerContext {
  ai: AIProviders;
  repo: StandardsRepository;
  mode: 'demo' | 'live';
  warnings: string[];
  maxUploadMb: number;
}

let ctx: Promise<ServerContext> | null = null;

export function getServerContext(): Promise<ServerContext> {
  if (!ctx) ctx = buildContext();
  return ctx;
}

/** For tests: inject a custom context. */
export function setServerContext(custom: ServerContext): void {
  ctx = Promise.resolve(custom);
}

async function buildContext(): Promise<ServerContext> {
  const env = process.env;
  const warnings: string[] = [];

  // ── LLM provider ──
  let llm: LLMProvider = new DemoLLMProvider();
  const aiProvider = (env.AI_PROVIDER ?? 'demo').toLowerCase();
  try {
    if (aiProvider === 'anthropic') {
      if (!env.ANTHROPIC_API_KEY) warnings.push('AI_PROVIDER=anthropic but ANTHROPIC_API_KEY is missing — using demo provider.');
      else {
        const { AnthropicLLMProvider } = await import('../src/engine/providers/anthropic');
        llm = new AnthropicLLMProvider(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL || 'claude-opus-5');
      }
    } else if (aiProvider === 'openai') {
      if (!env.OPENAI_API_KEY) warnings.push('AI_PROVIDER=openai but OPENAI_API_KEY is missing — using demo provider.');
      else {
        const { OpenAILLMProvider } = await import('../src/engine/providers/openai');
        llm = new OpenAILLMProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL || 'gpt-4o-mini');
      }
    } else if (aiProvider === 'groq') {
      if (!env.GROQ_API_KEY) warnings.push('AI_PROVIDER=groq but GROQ_API_KEY is missing — using demo provider.');
      else {
        const { OpenAILLMProvider } = await import('../src/engine/providers/openai');
        llm = new OpenAILLMProvider(env.GROQ_API_KEY, env.GROQ_MODEL || 'openai/gpt-oss-120b', 'https://api.groq.com/openai/v1');
      }
    } else if (aiProvider !== 'demo') {
      warnings.push(`Unknown AI_PROVIDER "${aiProvider}" — using demo provider.`);
    }
  } catch (e) {
    warnings.push(`LLM provider initialisation failed (${(e as Error).message}) — using demo provider.`);
    llm = new DemoLLMProvider();
  }

  // ── Embedding provider ──
  let embeddings: EmbeddingProvider = new LocalEmbeddingProvider();
  const embProvider = (env.EMBEDDING_PROVIDER ?? 'local').toLowerCase();
  try {
    if (embProvider === 'voyage') {
      if (!env.VOYAGE_API_KEY) warnings.push('EMBEDDING_PROVIDER=voyage but VOYAGE_API_KEY is missing — using local embeddings.');
      else {
        const { VoyageEmbeddingProvider } = await import('../src/engine/providers/openai');
        embeddings = new VoyageEmbeddingProvider(env.VOYAGE_API_KEY, env.VOYAGE_EMBEDDING_MODEL || 'voyage-3-lite');
      }
    }
  } catch (e) {
    warnings.push(`Embedding provider initialisation failed (${(e as Error).message}) — using local embeddings.`);
    embeddings = new LocalEmbeddingProvider();
  }

  // ── Repository ──
  let repo: StandardsRepository;
  const supaKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (env.SUPABASE_URL && supaKey) {
    try {
      const { SupabaseStandardsRepository } = await import('../src/engine/repository/supabaseRepository');
      const supa = new SupabaseStandardsRepository(env.SUPABASE_URL, supaKey);
      const info = await supa.datasetInfo();
      if (info.standardCount === 0) {
        warnings.push('Supabase is configured but the standards table is empty — using the in-memory demo dataset. Run `npm run ingest`.');
        repo = new MemoryStandardsRepository(loadDemoDataset(), embeddings);
      } else repo = supa;
    } catch (e) {
      warnings.push(`Supabase connection failed (${(e as Error).message}) — using the in-memory demo dataset.`);
      repo = new MemoryStandardsRepository(loadDemoDataset(), embeddings);
    }
  } else {
    repo = new MemoryStandardsRepository(loadDemoDataset(), embeddings);
  }

  // pgvector dimension guard: the memory repo can handle any provider, but Supabase cannot mix.
  if (repo.name.startsWith('supabase') && embeddings.name === 'local') {
    warnings.push('Supabase repository with local embeddings: vector search will fall back to full-text search unless the index was built with the same provider.');
  }

  return {
    ai: { llm, embeddings },
    repo,
    mode: llm.isLive ? 'live' : 'demo',
    warnings,
    maxUploadMb: Number(env.MAX_UPLOAD_MB) || 10,
  };
}
