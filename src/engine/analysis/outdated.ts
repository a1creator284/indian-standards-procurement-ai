import type { OutdatedReference, Standard, StandardRelationship } from '../types';
import { extractStandardReferences, familyKey, keyFromStandardNumber } from '../extraction/references';

/**
 * Compares standard references found in the input with the indexed dataset.
 * Never claims a standard is "officially current" — statuses are relative to
 * the indexed metadata and always carry evidence + a review action.
 */
export function detectOutdatedReferences(text: string, standards: Standard[], relationships: StandardRelationship[]): OutdatedReference[] {
  const refs = extractStandardReferences(text);
  if (!refs.length) return [];

  const byKey = new Map<string, Standard>();
  const byFamily = new Map<string, Standard[]>();
  for (const s of standards) {
    const key = keyFromStandardNumber(s.number);
    byKey.set(key, s);
    const fam = familyKey(key);
    const list = byFamily.get(fam);
    if (list) list.push(s);
    else byFamily.set(fam, [s]);
  }
  const supersededBy = new Map<string, string>();
  for (const r of relationships) if (r.type === 'superseded_by') supersededBy.set(r.from, r.to);
  const byId = new Map(standards.map((s) => [s.id, s]));

  return refs.map((ref): OutdatedReference => {
    let std = byKey.get(ref.key) ?? null;
    let partNote = '';
    if (!std && !ref.part) {
      const fam = byFamily.get(familyKey(ref.key));
      if (fam?.length) {
        std = fam[0];
        partNote = fam.length > 1 ? ` The reference does not specify a part; ${fam.length} parts are indexed — the first is shown.` : ' Matched by family (part not specified in the reference).';
      }
    }
    const base = {
      referenceText: ref.text,
      parsedNumber: ref.base,
      referencedYear: ref.year,
      standardId: std?.id ?? null,
      indexedLatestLabel: std?.latestVersion.label ?? null,
      indexedLatestYear: std?.latestVersion.year ?? null,
    };

    if (!std) {
      return {
        ...base,
        status: 'not-in-index',
        evidence: `"${ref.text}" was not found in the indexed dataset (${standards.length} standards indexed).`,
        recommendedAction: 'Verify the reference number and edition directly against the BIS catalogue.',
      };
    }

    const supersededId = supersededBy.get(std.id);
    if (std.revisionStatus === 'superseded' || supersededId) {
      const successor = supersededId ? byId.get(supersededId) : undefined;
      return {
        ...base,
        status: 'superseded',
        supersededById: supersededId,
        evidence: `${std.number} is recorded as superseded in the indexed dataset${successor ? ` by ${successor.number} (${successor.title})` : ''}.${partNote}`,
        recommendedAction: successor
          ? `Consider reviewing whether ${successor.number} should replace this reference. Verify supersession status with BIS.`
          : 'Consider reviewing the current status of this standard with BIS.',
      };
    }

    const latestYear = std.latestVersion.year;
    if (ref.year === null) {
      return {
        ...base,
        status: 'year-not-specified',
        evidence: `The reference does not state an edition year. Indexed latest edition: ${std.latestVersion.label}.${partNote}`,
        recommendedAction: 'Consider citing the edition year and amendments explicitly in the tender to avoid ambiguity.',
      };
    }
    if (latestYear === null) {
      return {
        ...base,
        status: 'year-not-specified',
        evidence: `Referenced edition ${ref.year}; the indexed dataset does not record an edition year for ${std.number}.${partNote}`,
        recommendedAction: 'Verify the current edition with BIS; the index cannot confirm currency.',
      };
    }
    if (ref.year < latestYear) {
      return {
        ...base,
        status: 'potentially-outdated',
        evidence: `Referenced edition ${ref.year} is older than the indexed latest edition ${std.latestVersion.label}${std.amendments.length ? ` (${std.amendments.length} amendment record(s) indexed)` : ''}.${partNote}`,
        recommendedAction: `Consider reviewing the reference against ${std.latestVersion.label} and its amendments. Verify with BIS before finalising.`,
      };
    }
    if (ref.year > latestYear) {
      return {
        ...base,
        status: 'newer-than-indexed',
        evidence: `Referenced edition ${ref.year} is newer than the indexed edition ${std.latestVersion.label}; the index may be stale.${partNote}`,
        recommendedAction: 'The dataset may need updating. Verify the referenced edition with BIS.',
      };
    }
    return {
      ...base,
      status: 'matches-indexed',
      evidence: `Referenced edition matches the indexed latest edition ${std.latestVersion.label}.${partNote}`,
      recommendedAction: 'No edition mismatch found in the index. Still verify amendments with BIS.',
    };
  });
}
