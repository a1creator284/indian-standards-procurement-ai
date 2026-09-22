import type { Certification, Standard, StandardCertification, StandardRelationship, StandardsDataset } from '../types';
import { cosine } from '../embeddings/local';
import { contentTokens } from '../text/clean';
import type { EmbeddingProvider } from '../providers/types';
import { standardEmbeddingText } from './normalize';
import type { PagedResult, StandardsQuery, StandardsRepository, VectorHit, VectorSearchOptions } from './types';

/**
 * In-memory repository backed by a normalised dataset. Used in DEMO MODE and in
 * tests. Embeddings are computed once per (provider, model) and cached.
 */
export class MemoryStandardsRepository implements StandardsRepository {
  readonly name: string;
  private readonly byId = new Map<string, Standard>();
  private readonly relsByStandard = new Map<string, StandardRelationship[]>();
  private readonly certsByStandard = new Map<string, StandardCertification[]>();
  private index: { key: string; vectors: Map<string, number[]> } | null = null;

  constructor(
    private readonly dataset: StandardsDataset,
    private readonly embeddings: EmbeddingProvider,
  ) {
    this.name = `memory:${dataset.meta.name}`;
    for (const s of dataset.standards) this.byId.set(s.id, s);
    for (const r of dataset.relationships) {
      push(this.relsByStandard, r.from, r);
      push(this.relsByStandard, r.to, r);
    }
    for (const c of dataset.standardCertifications) push(this.certsByStandard, c.standardId, c);
  }

  private async ensureIndex(): Promise<Map<string, number[]>> {
    const key = `${this.embeddings.name}:${this.embeddings.model}`;
    if (this.index?.key === key) return this.index.vectors;
    const standards = this.dataset.standards;
    const vectors = await this.embeddings.embed(standards.map(standardEmbeddingText));
    const map = new Map<string, number[]>();
    standards.forEach((s, i) => map.set(s.id, vectors[i]));
    this.index = { key, vectors: map };
    return map;
  }

  async getStandard(id: string): Promise<Standard | null> {
    return this.byId.get(id) ?? null;
  }

  async getStandards(ids: string[]): Promise<Standard[]> {
    return ids.map((id) => this.byId.get(id)).filter((s): s is Standard => Boolean(s));
  }

  async allStandards(): Promise<Standard[]> {
    return [...this.dataset.standards];
  }

  async listStandards(query: StandardsQuery): Promise<PagedResult<Standard>> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
    let items = this.dataset.standards;

    if (query.category) items = items.filter((s) => s.category === query.category);
    if (query.sector) items = items.filter((s) => s.sector === query.sector);
    if (query.revisionStatus) items = items.filter((s) => s.revisionStatus === query.revisionStatus);
    if (query.productType) {
      const pt = query.productType.toLowerCase();
      items = items.filter((s) => s.productTypes.some((p) => p.includes(pt)));
    }
    if (query.certification) {
      const cid = query.certification;
      items = items.filter((s) => (this.certsByStandard.get(s.id) ?? []).some((c) => c.certificationId === cid));
    }
    if (query.q?.trim()) {
      const q = query.q.trim().toLowerCase();
      const qTokens = contentTokens(q);
      const scored = items
        .map((s) => {
          const hay = `${s.number} ${s.title} ${s.scope} ${s.keywords.join(' ')} ${s.productTypes.join(' ')}`.toLowerCase();
          let score = 0;
          if (s.number.toLowerCase().replace(/\s+/g, '').includes(q.replace(/\s+/g, ''))) score += 10;
          if (s.title.toLowerCase().includes(q)) score += 5;
          for (const t of qTokens) if (hay.includes(t)) score += 1;
          return { s, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
      items = scored.map((x) => x.s);
    } else {
      items = [...items];
      const sort = query.sort ?? 'number';
      items.sort((a, b) =>
        sort === 'title'
          ? a.title.localeCompare(b.title)
          : sort === 'year'
            ? (b.latestVersion.year ?? 0) - (a.latestVersion.year ?? 0)
            : a.number.localeCompare(b.number, undefined, { numeric: true }),
      );
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total, page, pageSize };
  }

  async searchByVector(embedding: number[], opts: VectorSearchOptions = {}): Promise<VectorHit[]> {
    const vectors = await this.ensureIndex();
    const topK = opts.topK ?? 12;
    const min = opts.minSimilarity ?? 0;
    const hits: VectorHit[] = [];
    for (const s of this.dataset.standards) {
      if (opts.sector && s.sector !== opts.sector) continue;
      if (opts.category && s.category !== opts.category) continue;
      const v = vectors.get(s.id);
      if (!v) continue;
      const sim = cosine(embedding, v);
      if (sim >= min) hits.push({ standardId: s.id, similarity: sim, snippet: s.scope.slice(0, 200) });
    }
    return hits.sort((a, b) => b.similarity - a.similarity).slice(0, topK);
  }

  async searchByText(q: string, topK = 12): Promise<VectorHit[]> {
    const res = await this.listStandards({ q, pageSize: topK });
    return res.items.map((s, i) => ({ standardId: s.id, similarity: Math.max(0.2, 1 - i * 0.05), snippet: s.scope.slice(0, 200) }));
  }

  async getRelationships(standardId: string): Promise<StandardRelationship[]> {
    return [...(this.relsByStandard.get(standardId) ?? [])];
  }

  async getRelationshipsFor(ids: string[]): Promise<StandardRelationship[]> {
    const seen = new Set<string>();
    const out: StandardRelationship[] = [];
    for (const id of ids) {
      for (const r of this.relsByStandard.get(id) ?? []) {
        const key = `${r.from}|${r.to}|${r.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          out.push(r);
        }
      }
    }
    return out;
  }

  async getCertifications(): Promise<Certification[]> {
    return [...this.dataset.certifications];
  }

  async getStandardCertifications(standardId: string): Promise<StandardCertification[]> {
    return [...(this.certsByStandard.get(standardId) ?? [])];
  }

  async getStandardCertificationsFor(ids: string[]): Promise<StandardCertification[]> {
    return ids.flatMap((id) => this.certsByStandard.get(id) ?? []);
  }

  async datasetInfo() {
    return {
      name: this.dataset.meta.name,
      version: this.dataset.meta.version,
      standardCount: this.dataset.standards.length,
      disclaimer: this.dataset.meta.disclaimer,
    };
  }
}

function push<T>(map: Map<string, T[]>, key: string, value: T): void {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
