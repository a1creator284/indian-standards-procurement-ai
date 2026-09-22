import type {
  Certification,
  RevisionStatus,
  SourceMeta,
  Standard,
  StandardAmendment,
  StandardCategory,
  StandardCertification,
  StandardRelationship,
  StandardVersion,
  StandardsDataset,
  Sector,
  RelationshipType,
  CertificationApplicability,
} from '../types';

/**
 * Raw record shapes accepted by the ingestion pipeline (CSV/JSON import).
 * Everything optional is filled with safe defaults by `normalizeDataset`.
 */
export interface RawStandardRecord {
  id: string;
  number: string;
  title: string;
  category: StandardCategory;
  sector: Sector;
  productTypes?: string[];
  scope?: string;
  keywords?: string[];
  year?: number | null;
  editionLabel?: string;
  history?: Array<{ label: string; year: number | null; note?: string }>;
  amendments?: Array<{ number: number; year?: number | null; summary?: string; isPlaceholder?: boolean }>;
  status?: RevisionStatus;
  source?: Partial<SourceMeta>;
  isDemo?: boolean;
}

export interface RawRelationshipRecord {
  from: string;
  to: string;
  type: RelationshipType;
  note?: string;
}

export type RawCertificationRecord = Certification;

export interface RawStandardCertificationRecord {
  standardId: string;
  certificationId: string;
  applicability: CertificationApplicability;
  evidence: string;
  status?: StandardCertification['status'];
}

export interface RawDatasetInput {
  meta?: Partial<StandardsDataset['meta']>;
  standards: RawStandardRecord[];
  relationships: RawRelationshipRecord[];
  certifications: RawCertificationRecord[];
  standardCertifications: RawStandardCertificationRecord[];
}

export interface NormalizeReport {
  standards: number;
  relationships: number;
  droppedRelationships: string[];
  droppedCertifications: string[];
  duplicateStandards: string[];
}

const DEMO_SOURCE = (indexedAt: string): SourceMeta => ({
  name: 'IS Copilot Demo Dataset',
  type: 'demo-dataset',
  indexedAt,
  note: 'Representative metadata for demonstration — verify against BIS before procurement use.',
});

function versionLabel(number: string, year: number | null, editionLabel?: string): string {
  if (editionLabel) return editionLabel;
  return year ? `${number} : ${year}` : `${number} (edition year not indexed)`;
}

export function normalizeStandard(raw: RawStandardRecord, indexedAt: string): Standard {
  const year = raw.year ?? null;
  const status: RevisionStatus = raw.status ?? (year ? 'indexed-current' : 'unknown');
  const latest: StandardVersion = {
    label: versionLabel(raw.number, year, raw.editionLabel),
    year,
    status,
    note: status === 'superseded' ? 'Recorded as superseded in the indexed dataset' : undefined,
  };
  const history: StandardVersion[] = (raw.history ?? []).map((h) => ({
    label: h.label,
    year: h.year,
    status: 'historical',
    note: h.note,
  }));
  const amendments: StandardAmendment[] = (raw.amendments ?? []).map((a) => ({
    number: a.number,
    year: a.year ?? null,
    summary: a.summary ?? 'Representative amendment record (demo).',
    isPlaceholder: a.isPlaceholder ?? true,
  }));
  const source: SourceMeta = { ...DEMO_SOURCE(indexedAt), ...(raw.source ?? {}) } as SourceMeta;

  return {
    id: raw.id.trim().toLowerCase(),
    number: raw.number.trim(),
    title: raw.title.trim(),
    category: raw.category,
    sector: raw.sector,
    productTypes: dedupe((raw.productTypes ?? []).map((p) => p.trim().toLowerCase())),
    scope: (raw.scope ?? '').trim(),
    keywords: dedupe((raw.keywords ?? []).map((k) => k.trim().toLowerCase())),
    latestVersion: latest,
    versions: [latest, ...history].sort((a, b) => (b.year ?? 0) - (a.year ?? 0)),
    amendments,
    revisionStatus: status,
    source,
    isDemo: raw.isDemo ?? source.type === 'demo-dataset',
  };
}

/** Validate → normalise → deduplicate → map relationships. */
export function normalizeDataset(input: RawDatasetInput, indexedAt = new Date().toISOString()): { dataset: StandardsDataset; report: NormalizeReport } {
  const seen = new Map<string, Standard>();
  const duplicateStandards: string[] = [];
  for (const raw of input.standards) {
    if (!raw.id || !raw.number || !raw.title) throw new Error(`Invalid standard record: ${JSON.stringify(raw).slice(0, 120)}`);
    const std = normalizeStandard(raw, indexedAt);
    if (seen.has(std.id)) duplicateStandards.push(std.id);
    seen.set(std.id, std); // last one wins
  }

  const droppedRelationships: string[] = [];
  const relKeys = new Set<string>();
  const relationships: StandardRelationship[] = [];
  for (const r of input.relationships) {
    if (!seen.has(r.from) || !seen.has(r.to) || r.from === r.to) {
      droppedRelationships.push(`${r.from} -${r.type}-> ${r.to}`);
      continue;
    }
    const key = `${r.from}|${r.to}|${r.type}`;
    if (relKeys.has(key)) continue;
    relKeys.add(key);
    relationships.push({ from: r.from, to: r.to, type: r.type, note: r.note });
  }

  // mark superseded standards from relationship data if not already flagged
  for (const r of relationships) {
    if (r.type === 'superseded_by') {
      const s = seen.get(r.from)!;
      if (s.revisionStatus !== 'superseded') {
        s.revisionStatus = 'superseded';
        s.latestVersion = { ...s.latestVersion, status: 'superseded' };
      }
    }
  }

  const certIds = new Set(input.certifications.map((c) => c.id));
  const droppedCertifications: string[] = [];
  const standardCertifications: StandardCertification[] = [];
  for (const sc of input.standardCertifications) {
    if (!seen.has(sc.standardId) || !certIds.has(sc.certificationId)) {
      droppedCertifications.push(`${sc.standardId} -> ${sc.certificationId}`);
      continue;
    }
    standardCertifications.push({
      standardId: sc.standardId,
      certificationId: sc.certificationId,
      applicability: sc.applicability,
      evidence: sc.evidence,
      status: sc.status ?? 'verified-demo',
      source: DEMO_SOURCE(indexedAt),
    });
  }

  const dataset: StandardsDataset = {
    meta: {
      name: input.meta?.name ?? 'IS Copilot Dataset',
      version: input.meta?.version ?? '0.0.0',
      generatedAt: input.meta?.generatedAt ?? indexedAt,
      disclaimer: input.meta?.disclaimer ?? 'Verify against authoritative sources before procurement use.',
    },
    standards: [...seen.values()].sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })),
    relationships,
    certifications: input.certifications,
    standardCertifications,
  };

  return {
    dataset,
    report: {
      standards: dataset.standards.length,
      relationships: relationships.length,
      droppedRelationships,
      droppedCertifications,
      duplicateStandards,
    },
  };
}

/** Text used to embed a standard: number + title + scope + keywords + product types. */
export function standardEmbeddingText(s: Standard): string {
  return [s.number, s.title, s.scope, `Keywords: ${s.keywords.join(', ')}`, `Product types: ${s.productTypes.join(', ')}`, `Sector: ${s.sector}. Category: ${s.category}.`].join('\n');
}

function dedupe(list: string[]): string[] {
  return [...new Set(list.filter(Boolean))];
}
