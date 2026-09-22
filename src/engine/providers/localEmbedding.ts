import { LOCAL_EMBEDDING_DIM, localEmbed } from '../embeddings/local';
import type { EmbeddingProvider } from './types';

/** Deterministic local embeddings — the DEMO MODE default. */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  readonly name = 'local';
  readonly model = 'hashed-ngram-concept-v1';
  readonly dimensions = LOCAL_EMBEDDING_DIM;

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map(localEmbed);
  }
}
