import type { CertificationFinding, ExpandedRelationship, Freshness, Requirement, Standard } from '../types';
import type { RankedCandidate } from '../ranking/rerank';
import { RELATIONSHIP_LABELS } from '../graph/expand';

/** Builds a grounded, human-readable explanation for a recommendation. */
export function buildExplanation(
  ranked: RankedCandidate,
  requirements: Requirement[],
  relationships: ExpandedRelationship[],
  certifications: CertificationFinding[],
): { explanation: string; reasons: string[] } {
  const s = ranked.standard;
  const matched = requirements.filter((r) => ranked.matchedRequirementIds.includes(r.id));
  const matchedText = matched
    .slice(0, 4)
    .map((r) => r.text.replace(/^(Product|Environmental|Safety|Installation|Testing|Certification|Material|Performance|Mechanical|Warranty): /, '').toLowerCase())
    .join(', ');

  const reasons: string[] = [];
  if (matched.length) reasons.push(`Matches ${matched.length} extracted requirement${matched.length > 1 ? 's' : ''}: ${matchedText}`);
  reasons.push(`Semantic similarity to indexed scope: ${(ranked.semanticScore * 100).toFixed(0)}%`);
  if (s.productTypes.length) reasons.push(`Indexed product types: ${s.productTypes.slice(0, 3).join(', ')}`);
  const byType = new Map<string, number>();
  for (const r of relationships) byType.set(r.type, (byType.get(r.type) ?? 0) + 1);
  if (byType.size) reasons.push(`Connected to ${relationships.length} indexed standard(s): ${[...byType.entries()].map(([t, n]) => `${n} ${(RELATIONSHIP_LABELS[t as keyof typeof RELATIONSHIP_LABELS] ?? t.replace(/_/g, ' ')).toLowerCase()}`).join(', ')}`);
  const certs = certifications.filter((c) => c.standardId === s.id);
  if (certs.length) reasons.push(`Indexed certification mapping: ${certs.map((c) => c.certification.scheme).join(', ')}`);
  for (const r of ranked.providerReasons) if (!reasons.includes(r)) reasons.push(r);

  const explanation =
    `Recommended because the input specifies ${matchedText || 'a product description'} ` +
    `that correspond${matched.length === 1 ? 's' : ''} to the indexed scope and metadata for ${s.number} (${s.title}). ` +
    `${s.scope.split('. ')[0]}. ` +
    `This is an AI recommendation based on indexed metadata (${s.source.name}) and requires verification against the authoritative source.`;

  return { explanation, reasons: reasons.slice(0, 6) };
}

export function buildFreshness(s: Standard): Freshness {
  const statusText: Record<Standard['revisionStatus'], string> = {
    'indexed-current': 'Latest indexed edition',
    historical: 'Historical edition',
    superseded: 'Recorded as superseded in the index',
    withdrawn: 'Recorded as withdrawn in the index',
    unknown: 'Edition status not recorded in the index',
  };
  return {
    latestIndexedLabel: s.latestVersion.label,
    latestIndexedYear: s.latestVersion.year,
    revisionStatus: s.revisionStatus,
    amendmentCount: s.amendments.length,
    indexedAt: s.source.indexedAt,
    note: `${statusText[s.revisionStatus]}. ${s.isDemo ? 'Demo dataset — ' : ''}verify current status with BIS.`,
  };
}
