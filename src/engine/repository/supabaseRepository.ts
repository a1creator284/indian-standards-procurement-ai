import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  Certification,
  RevisionStatus,
  Standard,
  StandardCategory,
  StandardCertification,
  StandardRelationship,
  Sector,
  SourceMeta,
  RelationshipType,
  CertificationApplicability,
} from '../types';
import type { PagedResult, StandardsQuery, StandardsRepository, VectorHit, VectorSearchOptions } from './types';

/**
 * Supabase (PostgreSQL + pgvector) repository. SERVER-SIDE ONLY — uses the
 * service-role key. Reference data is cached in memory for the process lifetime
 * so that ordinary reads do not hit the database on every request.
 */
export class SupabaseStandardsRepository implements StandardsRepository {
  readonly name = 'supabase:pgvector';
  private readonly client: SupabaseClient;
  private cache: {
    standards: Map<string, Standard>;
    relationships: StandardRelationship[];
    certifications: Certification[];
    standardCertifications: StandardCertification[];
    loadedAt: number;
  } | null = null;

  constructor(url: string, serviceRoleKey: string, private readonly cacheTtlMs = 5 * 60_000) {
    this.client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  }

  private async load() {
    if (this.cache && Date.now() - this.cache.loadedAt < this.cacheTtlMs) return this.cache;
    const [std, ver, amd, rel, cert, sc] = await Promise.all([
      this.client.from('standards').select('*'),
      this.client.from('standard_versions').select('*'),
      this.client.from('standard_amendments').select('*'),
      this.client.from('standard_relationships').select('*'),
      this.client.from('certifications').select('*'),
      this.client.from('standard_certifications').select('*'),
    ]);
    for (const r of [std, ver, amd, rel, cert, sc]) if (r.error) throw new Error(`Supabase read failed: ${r.error.message}`);

    const versionsBy = groupBy(ver.data ?? [], (v) => v.standard_id as string);
    const amendmentsBy = groupBy(amd.data ?? [], (a) => a.standard_id as string);
    const standards = new Map<string, Standard>();
    for (const row of std.data ?? []) {
      const versions = (versionsBy.get(row.id) ?? []).map((v) => ({
        label: v.label as string,
        year: (v.year as number | null) ?? null,
        status: v.status as RevisionStatus,
        note: (v.note as string | null) ?? undefined,
      }));
      const latest = (versionsBy.get(row.id) ?? []).find((v) => v.is_latest);
      const source: SourceMeta = {
        name: row.source_name,
        type: row.source_type,
        indexedAt: row.indexed_at,
        url: row.source_url ?? undefined,
        note: row.source_note ?? undefined,
      };
      standards.set(row.id, {
        id: row.id,
        number: row.number,
        title: row.title,
        category: row.category as StandardCategory,
        sector: row.sector as Sector,
        productTypes: row.product_types ?? [],
        scope: row.scope ?? '',
        keywords: row.keywords ?? [],
        latestVersion: latest
          ? { label: latest.label, year: latest.year ?? null, status: latest.status as RevisionStatus, note: latest.note ?? undefined }
          : { label: `${row.number} (edition not indexed)`, year: null, status: 'unknown' },
        versions: versions.sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
        amendments: (amendmentsBy.get(row.id) ?? []).map((a) => ({
          number: a.number as number,
          year: (a.year as number | null) ?? null,
          summary: a.summary as string,
          isPlaceholder: Boolean(a.is_placeholder),
        })),
        revisionStatus: row.revision_status as RevisionStatus,
        source,
        isDemo: Boolean(row.is_demo),
      });
    }

    this.cache = {
      standards,
      relationships: (rel.data ?? []).map((r) => ({ from: r.from_id, to: r.to_id, type: r.type as RelationshipType, note: r.note ?? undefined })),
      certifications: (cert.data ?? []).map((c) => ({ id: c.id, scheme: c.scheme, name: c.name, authority: c.authority, description: c.description, url: c.url ?? undefined })),
      standardCertifications: (sc.data ?? []).map((s) => ({
        standardId: s.standard_id,
        certificationId: s.certification_id,
        applicability: s.applicability as CertificationApplicability,
        evidence: s.evidence,
        status: s.status,
        source: { name: s.source_name ?? 'Imported', type: 'imported', indexedAt: new Date().toISOString() },
      })),
      loadedAt: Date.now(),
    };
    return this.cache;
  }

  async getStandard(id: string) {
    return (await this.load()).standards.get(id) ?? null;
  }
  async getStandards(ids: string[]) {
    const c = await this.load();
    return ids.map((id) => c.standards.get(id)).filter((s): s is Standard => Boolean(s));
  }
  async allStandards() {
    return [...(await this.load()).standards.values()];
  }

  async listStandards(query: StandardsQuery): Promise<PagedResult<Standard>> {
    // Reuse the in-memory filtering logic on the cached reference data.
    const { MemoryStandardsRepository } = await import('./memoryRepository');
    const { LocalEmbeddingProvider } = await import('../providers/localEmbedding');
    const c = await this.load();
    const mem = new MemoryStandardsRepository(
      {
        meta: { name: 'supabase-cache', version: '', generatedAt: '', disclaimer: '' },
        standards: [...c.standards.values()],
        relationships: c.relationships,
        certifications: c.certifications,
        standardCertifications: c.standardCertifications,
      },
      new LocalEmbeddingProvider(),
    );
    return mem.listStandards(query);
  }

  async searchByVector(embedding: number[], opts: VectorSearchOptions = {}): Promise<VectorHit[]> {
    const q =
      embedding.length === 1536 ? embedding : embedding.length < 1536 ? embedding.concat(new Array(1536 - embedding.length).fill(0)) : embedding.slice(0, 1536);
    const { data, error } = await this.client.rpc('match_standards_ranked', {
      query_embedding: q,
      match_count: opts.topK ?? 12,
      filter_sector: opts.sector ?? null,
      filter_category: opts.category ?? null,
      min_similarity: opts.minSimilarity ?? 0,
    });
    if (error) throw new Error(`Vector search failed: ${error.message}`);
    return (data ?? []).map((r: { standard_id: string; similarity: number; content: string }) => ({
      standardId: r.standard_id,
      similarity: r.similarity,
      snippet: r.content.slice(0, 200),
    }));
  }

  async searchByText(q: string, topK = 12): Promise<VectorHit[]> {
    const { data, error } = await this.client.rpc('search_standards_text', { q, match_count: topK });
    if (error) throw new Error(`Text search failed: ${error.message}`);
    return (data ?? []).map((r: { standard_id: string; rank: number }) => ({ standardId: r.standard_id, similarity: Math.min(1, r.rank), snippet: '' }));
  }

  async getRelationships(standardId: string) {
    return (await this.load()).relationships.filter((r) => r.from === standardId || r.to === standardId);
  }
  async getRelationshipsFor(ids: string[]) {
    const set = new Set(ids);
    return (await this.load()).relationships.filter((r) => set.has(r.from) || set.has(r.to));
  }
  async getCertifications() {
    return [...(await this.load()).certifications];
  }
  async getStandardCertifications(standardId: string) {
    return (await this.load()).standardCertifications.filter((s) => s.standardId === standardId);
  }
  async getStandardCertificationsFor(ids: string[]) {
    const set = new Set(ids);
    return (await this.load()).standardCertifications.filter((s) => set.has(s.standardId));
  }
  async datasetInfo() {
    const c = await this.load();
    return {
      name: 'Supabase standards index',
      version: 'live',
      standardCount: c.standards.size,
      disclaimer: 'Indexed metadata — verify against authoritative sources before procurement use.',
    };
  }
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return map;
}
