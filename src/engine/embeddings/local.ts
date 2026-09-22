import { contentTokens } from '../text/clean';
import { matchConcepts } from '../language/detect';

/**
 * Local, deterministic "semantic-lite" embedding model used in DEMO MODE.
 *
 * Features are hashed into a fixed-size vector (feature hashing / "hashing trick"):
 *  - unigrams and bigrams of content tokens (lexical signal)
 *  - domain concept ids from the lexicon, strongly weighted (semantic signal —
 *    "IP66", "waterproof" and "जलरोधक" all map to the same concept feature)
 *  - light stemming so "cables" ≈ "cable"
 *
 * It is not a neural model, but it gives stable cosine similarities that go
 * beyond exact keyword matching, and it is swapped for a real provider
 * (OpenAI / Voyage) by setting EMBEDDING_PROVIDER.
 */
export const LOCAL_EMBEDDING_DIM = 384;

function fnv1a(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function stem(token: string): string {
  if (token.length <= 3) return token;
  return token.replace(/(ings?|ies|es|s|ed|er)$/u, (m) => (token.length - m.length >= 3 ? '' : m));
}

function addFeature(vec: Float32Array, feature: string, weight: number): void {
  const h = fnv1a(feature);
  const idx = h % LOCAL_EMBEDDING_DIM;
  const sign = (h >>> 16) & 1 ? 1 : -1;
  vec[idx] += sign * weight;
}

export function localEmbed(text: string): number[] {
  const vec = new Float32Array(LOCAL_EMBEDDING_DIM);
  const tokens = contentTokens(text).map(stem);
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const [t, c] of counts) addFeature(vec, `u:${t}`, 1 + Math.log(c));
  for (let i = 0; i < tokens.length - 1; i++) addFeature(vec, `b:${tokens[i]}_${tokens[i + 1]}`, 0.6);
  for (const concept of matchConcepts(text)) {
    addFeature(vec, `c:${concept.id}`, 2.5 * concept.weight);
    for (const sector of concept.sectors) addFeature(vec, `s:${sector}`, 0.8);
  }
  let norm = 0;
  for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (v) => v / norm);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}
