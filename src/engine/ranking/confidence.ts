import type { ConfidenceBand, ConfidenceBreakdown } from '../types';

/**
 * Transparent "AI Recommendation Confidence" model.
 * Each component is 0..1; weights sum to 1; total is expressed 0..100.
 * This is NOT an official BIS score — it summarises how strongly the indexed
 * metadata supports the recommendation.
 */
export const CONFIDENCE_WEIGHTS = {
  semantic: 0.35, // vector similarity + provider rerank
  metadata: 0.2, // keyword / product-type / scope overlap
  category: 0.1, // sector / product category match
  coverage: 0.15, // share of extracted requirements the standard addresses
  relationship: 0.1, // connectivity with other candidates in the graph
  evidence: 0.1, // number and strength of evidence snippets
} as const;

export function bandFor(total: number): ConfidenceBand {
  if (total >= 80) return 'very-high';
  if (total >= 65) return 'high';
  if (total >= 45) return 'medium';
  return 'low';
}

export function computeConfidence(parts: Omit<ConfidenceBreakdown, 'total' | 'band'>): ConfidenceBreakdown {
  const clamp = (n: number) => Math.max(0, Math.min(1, Number.isFinite(n) ? n : 0));
  const p = {
    semantic: clamp(parts.semantic),
    metadata: clamp(parts.metadata),
    category: clamp(parts.category),
    coverage: clamp(parts.coverage),
    relationship: clamp(parts.relationship),
    evidence: clamp(parts.evidence),
  };
  const total =
    100 *
    (p.semantic * CONFIDENCE_WEIGHTS.semantic +
      p.metadata * CONFIDENCE_WEIGHTS.metadata +
      p.category * CONFIDENCE_WEIGHTS.category +
      p.coverage * CONFIDENCE_WEIGHTS.coverage +
      p.relationship * CONFIDENCE_WEIGHTS.relationship +
      p.evidence * CONFIDENCE_WEIGHTS.evidence);
  const rounded = Math.round(total);
  return { ...p, total: rounded, band: bandFor(rounded) };
}

export const BAND_LABELS: Record<ConfidenceBand, string> = {
  'very-high': 'Very High',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};
