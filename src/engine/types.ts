/**
 * Core domain types for the IS Copilot engine.
 * These are shared by the frontend, the API layer and the ingestion scripts.
 * Keep this file free of runtime imports.
 */

// ───────────────────────────── Standards knowledge model ─────────────────────

export type StandardCategory =
  | 'product'
  | 'test-method'
  | 'code-of-practice'
  | 'safety'
  | 'terminology'
  | 'installation'
  | 'general';

export type Sector =
  | 'lighting'
  | 'electrical'
  | 'cables'
  | 'civil'
  | 'water'
  | 'renewable'
  | 'it-electronics'
  | 'mechanical'
  | 'metering'
  | 'jewellery'
  | 'general';

export type RelationshipType =
  | 'normative_reference'
  | 'test_method'
  | 'terminology'
  | 'safety'
  | 'installation'
  | 'related_product'
  | 'allied'
  | 'superseded_by'
  | 'part_of';

export type RevisionStatus = 'indexed-current' | 'historical' | 'superseded' | 'withdrawn' | 'unknown';

export type SourceType = 'demo-dataset' | 'bis-catalogue' | 'user-upload' | 'imported';

export interface SourceMeta {
  name: string;
  type: SourceType;
  indexedAt: string; // ISO date
  url?: string;
  note?: string;
}

export interface StandardVersion {
  label: string; // e.g. "IS 694 : 2010"
  year: number | null;
  status: RevisionStatus;
  note?: string;
}

export interface StandardAmendment {
  number: number;
  year: number | null;
  summary: string;
  isPlaceholder: boolean; // true = representative demo record, not verified
}

export interface Standard {
  id: string; // stable slug, e.g. "is-10322-5-3"
  number: string; // display number, e.g. "IS 10322 (Part 5/Sec 3)"
  title: string;
  category: StandardCategory;
  sector: Sector;
  productTypes: string[];
  scope: string; // representative summary (NOT official text)
  keywords: string[];
  latestVersion: StandardVersion;
  versions: StandardVersion[];
  amendments: StandardAmendment[];
  revisionStatus: RevisionStatus;
  source: SourceMeta;
  isDemo: boolean;
}

export interface StandardRelationship {
  from: string; // standard id
  to: string; // standard id
  type: RelationshipType;
  note?: string;
  source?: SourceMeta;
}

export type CertificationScheme = 'BIS-ISI' | 'BIS-CRS' | 'BIS-Hallmarking' | 'BIS-FMCS' | 'Other';

export interface Certification {
  id: string;
  scheme: CertificationScheme;
  name: string;
  authority: string;
  description: string;
  url?: string;
}

export type CertificationApplicability =
  | 'indexed-mandatory'
  | 'indexed-voluntary'
  | 'indexed-listed'
  | 'unknown';

export interface StandardCertification {
  standardId: string;
  certificationId: string;
  applicability: CertificationApplicability;
  evidence: string;
  status: 'verified-demo' | 'unverified' | 'verified';
  source: SourceMeta;
}

export interface StandardsDataset {
  meta: { name: string; version: string; generatedAt: string; disclaimer: string };
  standards: Standard[];
  relationships: StandardRelationship[];
  certifications: Certification[];
  standardCertifications: StandardCertification[];
}

// ───────────────────────────── Analysis / requirements ───────────────────────

export type InputSource = 'text' | 'pdf' | 'paste';
export type LanguageCode = 'en' | 'hi' | 'hinglish' | 'unknown';

export type RequirementCategory =
  | 'product'
  | 'performance'
  | 'electrical'
  | 'environmental'
  | 'safety'
  | 'mechanical'
  | 'material'
  | 'installation'
  | 'testing'
  | 'certification'
  | 'dimensional'
  | 'quantity'
  | 'warranty'
  | 'reference'
  | 'other';

export interface Requirement {
  id: string;
  text: string; // normalised, human readable
  category: RequirementCategory;
  entity?: string; // e.g. "ingress protection"
  value?: string; // e.g. "IP66"
  unit?: string;
  confidence: number; // 0..1
  sourceSpan?: string; // original snippet
}

export interface Evidence {
  id: string;
  standardId: string;
  field: 'title' | 'scope' | 'keywords' | 'productTypes' | 'relationship' | 'certification' | 'version';
  snippet: string;
  source: SourceMeta;
  score: number; // 0..1
}

export type ConfidenceBand = 'very-high' | 'high' | 'medium' | 'low';

export interface ConfidenceBreakdown {
  semantic: number; // 0..1
  metadata: number;
  category: number;
  coverage: number;
  relationship: number;
  evidence: number;
  total: number; // 0..100
  band: ConfidenceBand;
}

export interface ExpandedRelationship {
  type: RelationshipType;
  standard: Standard;
  note?: string;
  direction: 'outgoing' | 'incoming';
}

export interface Freshness {
  latestIndexedLabel: string;
  latestIndexedYear: number | null;
  revisionStatus: RevisionStatus;
  amendmentCount: number;
  indexedAt: string;
  note: string;
}

export interface Recommendation {
  standard: Standard;
  role: 'primary' | 'related';
  confidence: ConfidenceBreakdown;
  reasons: string[];
  explanation: string;
  matchedRequirementIds: string[];
  relationships: ExpandedRelationship[];
  certifications: CertificationFinding[];
  evidence: Evidence[];
  freshness: Freshness;
}

export interface CertificationFinding {
  standardId: string;
  standardNumber: string;
  certification: Certification;
  applicability: CertificationApplicability;
  evidence: string;
  status: StandardCertification['status'];
  source: SourceMeta;
}

export type GapType =
  | 'missing-standard'
  | 'outdated-reference'
  | 'missing-test'
  | 'missing-safety'
  | 'missing-installation'
  | 'missing-certification'
  | 'missing-terminology'
  | 'ambiguous-requirement'
  | 'incomplete-field'
  | 'missing-performance';

export type GapSeverity = 'high' | 'medium' | 'low';

export interface GapFinding {
  id: string;
  type: GapType;
  severity: GapSeverity;
  issue: string;
  whyItMatters: string;
  relatedStandardIds: string[];
  evidence: string;
  suggestedAction: string;
}

export type OutdatedStatus =
  | 'potentially-outdated'
  | 'superseded'
  | 'matches-indexed'
  | 'newer-than-indexed'
  | 'not-in-index'
  | 'year-not-specified';

export interface OutdatedReference {
  referenceText: string;
  parsedNumber: string;
  referencedYear: number | null;
  standardId: string | null;
  indexedLatestLabel: string | null;
  indexedLatestYear: number | null;
  status: OutdatedStatus;
  evidence: string;
  recommendedAction: string;
  supersededById?: string;
}

export interface GraphNode {
  id: string;
  label: string;
  sublabel?: string;
  kind: 'product' | 'primary' | 'related' | 'certification';
  category?: StandardCategory;
  standardId?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: RelationshipType | 'recommends' | 'certifies';
  label: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface AnalysisInput {
  original: string;
  normalized: string;
  language: LanguageCode;
  source: InputSource;
  fileName?: string;
  translationNote?: string;
}

export interface ProviderInfo {
  mode: 'demo' | 'live';
  llm: string;
  embeddings: string;
  repository: string;
}

export interface AnalysisSummary {
  productDescription: string;
  requirementCount: number;
  primaryCount: number;
  relatedCount: number;
  gapCount: number;
  outdatedCount: number;
  certificationCount: number;
  headline: string;
}

export interface AnalysisResult {
  id: string;
  createdAt: string;
  input: AnalysisInput;
  requirements: Requirement[];
  recommendations: Recommendation[]; // primary
  related: Recommendation[]; // expanded / allied
  certifications: CertificationFinding[];
  gaps: GapFinding[];
  outdated: OutdatedReference[];
  graph: KnowledgeGraph;
  summary: AnalysisSummary;
  provider: ProviderInfo;
  disclaimer: string;
  timingsMs: Record<string, number>;
}

// ───────────────────────────── Spec generation / chat ────────────────────────

export interface GeneratedSpecSection {
  id: string;
  title: string;
  content: string; // markdown
}

export interface GeneratedSpec {
  id: string;
  analysisId: string;
  createdAt: string;
  title: string;
  sections: GeneratedSpecSection[];
  disclaimer: string;
  mode: 'demo' | 'live';
}

export interface ChatCitation {
  standardId: string;
  standardNumber: string;
  snippet: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citations?: ChatCitation[];
  createdAt: string;
}

// ───────────────────────────── History ───────────────────────────────────────

export interface HistoryEntry {
  id: string;
  query: string;
  createdAt: string;
  source: InputSource;
  language: LanguageCode;
  recommendationCount: number;
  topStandard: string | null;
  gapCount: number;
  mode: 'demo' | 'live';
}

export const AI_DISCLAIMER =
  'AI-generated recommendation based on indexed metadata. Not an official BIS determination. ' +
  'Verify against the latest authoritative sources before procurement use.';
