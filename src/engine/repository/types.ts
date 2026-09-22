import type {
  Certification,
  Standard,
  StandardCertification,
  StandardRelationship,
  StandardCategory,
  Sector,
} from '../types';

export interface VectorHit {
  standardId: string;
  similarity: number; // 0..1
  snippet: string;
}

export interface VectorSearchOptions {
  topK?: number;
  sector?: Sector;
  category?: StandardCategory;
  minSimilarity?: number;
}

export interface StandardsQuery {
  q?: string;
  category?: StandardCategory;
  sector?: Sector;
  productType?: string;
  revisionStatus?: string;
  certification?: string; // certification id
  sort?: 'number' | 'title' | 'year';
  page?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Data port for standards knowledge. Implementations: in-memory (demo seed) and
 * Supabase (PostgreSQL + pgvector).
 */
export interface StandardsRepository {
  readonly name: string;
  getStandard(id: string): Promise<Standard | null>;
  getStandards(ids: string[]): Promise<Standard[]>;
  listStandards(query: StandardsQuery): Promise<PagedResult<Standard>>;
  allStandards(): Promise<Standard[]>;
  searchByVector(embedding: number[], opts?: VectorSearchOptions): Promise<VectorHit[]>;
  searchByText(q: string, topK?: number): Promise<VectorHit[]>;
  getRelationships(standardId: string): Promise<StandardRelationship[]>; // both directions
  getRelationshipsFor(ids: string[]): Promise<StandardRelationship[]>;
  getCertifications(): Promise<Certification[]>;
  getStandardCertifications(standardId: string): Promise<StandardCertification[]>;
  getStandardCertificationsFor(ids: string[]): Promise<StandardCertification[]>;
  datasetInfo(): Promise<{ name: string; version: string; standardCount: number; disclaimer: string }>;
}
