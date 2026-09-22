import type { Sector, Standard } from '../types';
import type { EmbeddingProvider } from '../providers/types';
import type { StandardsRepository, VectorHit } from '../repository/types';
import { chunkText } from '../text/clean';
import { matchConcepts } from '../language/detect';

export interface RetrievedCandidate {
  standard: Standard;
  semanticScore: number; // best chunk similarity, 0..1
  chunkHits: number;
  snippet: string;
  sectorMatch: boolean;
}

export interface RetrievalOptions {
  topK?: number;
  /** Hard sector filter; by default sectors are inferred and used as a soft boost. */
  sector?: Sector;
}

/** Infers likely sectors from lexicon concepts (excluding generic ones). */
export function inferSectors(text: string): Sector[] {
  const counts = new Map<Sector, number>();
  for (const c of matchConcepts(text)) {
    for (const s of c.sectors) {
      if (s === 'general') continue;
      counts.set(s, (counts.get(s) ?? 0) + c.weight);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
}

/**
 * Embeds the (chunked) input, runs nearest-neighbour search per chunk and
 * aggregates the hits per standard. Metadata (sector) is applied as a soft boost
 * so that cross-sector allied standards are not lost.
 */
export async function retrieveCandidates(
  text: string,
  repo: StandardsRepository,
  embeddings: EmbeddingProvider,
  opts: RetrievalOptions = {},
): Promise<{ candidates: RetrievedCandidate[]; sectors: Sector[]; usedFallback: boolean }> {
  const topK = opts.topK ?? 12;
  const chunks = chunkText(text, 1200, 150).slice(0, 12); // cap embedding cost for very long PDFs
  const sectors = inferSectors(text);
  const primarySectors = new Set(sectors.slice(0, 2));

  let usedFallback = false;
  const agg = new Map<string, { best: number; hits: number; snippet: string }>();

  try {
    const vectors = await embeddings.embed(chunks.map((c) => c.text));
    for (const v of vectors) {
      const hits: VectorHit[] = await repo.searchByVector(v, { topK: topK * 2, sector: opts.sector });
      for (const h of hits) {
        const cur = agg.get(h.standardId);
        if (!cur) agg.set(h.standardId, { best: h.similarity, hits: 1, snippet: h.snippet });
        else agg.set(h.standardId, { best: Math.max(cur.best, h.similarity), hits: cur.hits + 1, snippet: cur.snippet });
      }
    }
  } catch {
    usedFallback = true;
  }

  if (agg.size === 0) {
    // Vector search unavailable or empty — fall back to lexical search.
    usedFallback = true;
    const hits = await repo.searchByText(text, topK * 2);
    for (const h of hits) agg.set(h.standardId, { best: h.similarity, hits: 1, snippet: h.snippet });
  }

  const standards = await repo.getStandards([...agg.keys()]);
  const candidates: RetrievedCandidate[] = standards.map((s) => {
    const a = agg.get(s.id)!;
    const sectorMatch = primarySectors.has(s.sector);
    const multiChunkBonus = Math.min(0.06, (a.hits - 1) * 0.02);
    const score = clamp(a.best + multiChunkBonus + (sectorMatch ? 0.05 : 0));
    return { standard: s, semanticScore: score, chunkHits: a.hits, snippet: a.snippet, sectorMatch };
  });

  candidates.sort((a, b) => b.semanticScore - a.semanticScore);
  return { candidates: candidates.slice(0, topK), sectors, usedFallback };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(1, n));
}
