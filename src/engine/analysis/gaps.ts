import type { CertificationFinding, ExpandedRelationship, GapFinding, InputSource, OutdatedReference, Requirement, Sector, Standard } from '../types';
import { RELATIONSHIP_LABELS } from '../graph/expand';

export interface GapContext {
  source: InputSource;
  text: string;
  requirements: Requirement[];
  primaries: Standard[];
  expansions: Map<string, ExpandedRelationship[]>;
  certifications: CertificationFinding[];
  outdated: OutdatedReference[];
  sectors: Sector[];
}

/** Expected performance parameters per sector — used to flag missing fields (cautiously). */
const EXPECTED_PARAMETERS: Partial<Record<Sector, Array<{ entity: string; label: string }>>> = {
  lighting: [
    { entity: 'rated power', label: 'rated power (W)' },
    { entity: 'luminous efficacy', label: 'luminous efficacy (lm/W) or luminous flux (lm)' },
    { entity: 'ingress protection', label: 'ingress protection (IP) rating' },
    { entity: 'colour temperature', label: 'correlated colour temperature (K)' },
    { entity: 'surge protection', label: 'surge protection level (kV)' },
    { entity: 'rated life', label: 'rated life / lumen maintenance (hours, L70)' },
    { entity: 'power factor', label: 'power factor' },
  ],
  cables: [
    { entity: 'conductor size', label: 'conductor size (sq mm)' },
    { entity: 'rated voltage', label: 'voltage grade' },
    { entity: 'copper conductor', label: 'conductor material (copper / aluminium)' },
  ],
  electrical: [
    { entity: 'rated voltage', label: 'rated voltage' },
    { entity: 'rated current', label: 'rated current' },
    { entity: 'ingress protection', label: 'enclosure protection (IP) rating' },
  ],
  civil: [{ entity: 'grade', label: 'material grade (e.g. concrete / steel grade)' }],
  water: [{ entity: 'pressure rating', label: 'pressure class / rating' }],
  mechanical: [
    { entity: 'rated power', label: 'rated power (kW / HP)' },
    { entity: 'rated voltage', label: 'supply voltage / phase' },
  ],
  renewable: [
    { entity: 'solar capacity', label: 'PV capacity (kWp)' },
    { entity: 'rated voltage', label: 'system voltage' },
  ],
  metering: [
    { entity: 'accuracy class', label: 'accuracy class' },
    { entity: 'rated voltage', label: 'rated voltage' },
  ],
  'it-electronics': [{ entity: 'rated voltage', label: 'input voltage range' }],
};

/**
 * Rule-based tender gap analysis. Every finding is phrased cautiously
 * ("potential gap", "not found in the input") and carries evidence + an action.
 */
export function analyzeGaps(ctx: GapContext): GapFinding[] {
  const gaps: GapFinding[] = [];
  let n = 0;
  const add = (g: Omit<GapFinding, 'id'>) => gaps.push({ id: `gap-${++n}`, ...g });
  const has = (cat: Requirement['category']) => ctx.requirements.some((r) => r.category === cat);
  const hasEntity = (entity: string) => ctx.requirements.some((r) => (r.entity ?? '').toLowerCase().includes(entity) || r.text.toLowerCase().includes(entity));
  const isDocument = ctx.source === 'pdf' || ctx.source === 'paste' || ctx.text.length > 600;
  const top = ctx.primaries.slice(0, 5);
  const topIds = top.map((s) => s.id);

  const relatedOfType = (type: ExpandedRelationship['type']) => {
    const out = new Map<string, Standard>();
    for (const id of topIds) for (const r of ctx.expansions.get(id) ?? []) if (r.type === type) out.set(r.standard.id, r.standard);
    return [...out.values()];
  };
  const fmt = (list: Standard[]) => list.slice(0, 3).map((s) => s.number).join(', ');

  // 1. Outdated / superseded references
  for (const o of ctx.outdated) {
    if (o.status === 'potentially-outdated' || o.status === 'superseded') {
      add({
        type: 'outdated-reference',
        severity: 'high',
        issue: `${o.status === 'superseded' ? 'Superseded' : 'Potentially outdated'} reference: ${o.referenceText}`,
        whyItMatters: 'Citing an older or superseded edition can lead to bids evaluated against requirements that no longer reflect the indexed current edition.',
        relatedStandardIds: [o.standardId, o.supersededById].filter((x): x is string => Boolean(x)),
        evidence: o.evidence,
        suggestedAction: o.recommendedAction,
      });
    }
  }

  // 2. Primary standards not referenced in a document-style input
  if (isDocument) {
    for (const s of top.slice(0, 3)) {
      const referenced = ctx.outdated.some((o) => o.standardId === s.id);
      if (!referenced) {
        add({
          type: 'missing-standard',
          severity: 'medium',
          issue: `${s.number} is not referenced in the specification`,
          whyItMatters: `The indexed metadata for ${s.number} (${s.title}) corresponds closely to the described product, but the specification does not cite it.`,
          relatedStandardIds: [s.id],
          evidence: `Not found in indexed specification text. Recommended by the engine with confidence based on indexed scope: "${s.scope.slice(0, 120)}…"`,
          suggestedAction: `Consider reviewing whether ${s.number} should be cited as an applicable standard. Verify against BIS.`,
        });
      }
    }
  }

  // 3. Missing test / safety / installation / terminology requirements
  const testStds = relatedOfType('test_method');
  if (!has('testing') && testStds.length) {
    add({
      type: 'missing-test',
      severity: 'medium',
      issue: 'No testing requirements found in the input',
      whyItMatters: 'Without test methods and acceptance criteria, conformity of supplied items cannot be verified objectively.',
      relatedStandardIds: testStds.map((s) => s.id),
      evidence: `Indexed test-method relationships for the recommended standards: ${fmt(testStds)}.`,
      suggestedAction: `Consider specifying type/routine/acceptance tests with reference to ${fmt(testStds)} and a NABL-accredited test report requirement.`,
    });
  }
  const safetyStds = relatedOfType('safety');
  if (!has('safety') && safetyStds.length) {
    add({
      type: 'missing-safety',
      severity: 'high',
      issue: 'No safety requirements found in the input',
      whyItMatters: 'Safety requirements (electric shock, insulation, fire, surge) protect end users and installers and are commonly evaluated separately from performance.',
      relatedStandardIds: safetyStds.map((s) => s.id),
      evidence: `Indexed safety relationships: ${fmt(safetyStds)}.`,
      suggestedAction: `Consider adding safety compliance clauses referencing ${fmt(safetyStds)}.`,
    });
  }
  const installStds = relatedOfType('installation');
  if (!has('installation') && installStds.length) {
    add({
      type: 'missing-installation',
      severity: 'medium',
      issue: 'No installation / erection requirements found in the input',
      whyItMatters: 'Installation practice (mounting, wiring, earthing) often determines real-world performance and safety of the supplied product.',
      relatedStandardIds: installStds.map((s) => s.id),
      evidence: `Indexed installation / code-of-practice relationships: ${fmt(installStds)}.`,
      suggestedAction: `Consider referencing installation practice from ${fmt(installStds)} and defining site acceptance criteria.`,
    });
  }
  const termStds = relatedOfType('terminology');
  if (termStds.length && !ctx.outdated.some((o) => termStds.some((t) => t.id === o.standardId))) {
    add({
      type: 'missing-terminology',
      severity: 'low',
      issue: 'No terminology / definitions standard referenced',
      whyItMatters: 'Consistent definitions reduce disputes over the meaning of technical terms during evaluation.',
      relatedStandardIds: termStds.map((s) => s.id),
      evidence: `Indexed terminology relationship: ${fmt(termStds)}.`,
      suggestedAction: `Consider adding a definitions clause referencing ${fmt(termStds)}.`,
    });
  }

  // 4. Certification not mentioned though mapping exists
  if (!has('certification') && ctx.certifications.length) {
    const c = ctx.certifications[0];
    add({
      type: 'missing-certification',
      severity: c.applicability === 'indexed-mandatory' ? 'high' : 'medium',
      issue: `Certification requirement not stated (${c.certification.scheme} mapping indexed for ${c.standardNumber})`,
      whyItMatters: 'If a certification scheme applies, bidders must be told which mark/registration is required to avoid non-compliant supply.',
      relatedStandardIds: [...new Set(ctx.certifications.map((x) => x.standardId))],
      evidence: c.evidence,
      suggestedAction: `Consider stating the certification requirement explicitly (${c.certification.name}). Verify applicability with BIS / the relevant QCO.`,
    });
  }

  // 5. Missing performance parameters for the primary sector
  const sector = ctx.sectors[0];
  const expected = sector ? (EXPECTED_PARAMETERS[sector] ?? []) : [];
  const missing = expected.filter((p) => !hasEntity(p.entity));
  if (missing.length && missing.length < expected.length) {
    add({
      type: 'missing-performance',
      severity: 'medium',
      issue: `Performance parameters not found: ${missing.map((m) => m.label).join('; ')}`,
      whyItMatters: 'Unstated parameters leave evaluation criteria open to interpretation and weaken comparability of bids.',
      relatedStandardIds: topIds.slice(0, 2),
      evidence: `Extracted ${ctx.requirements.length} requirement(s); the listed parameters were not detected in the input for the "${sector}" sector.`,
      suggestedAction: 'Consider specifying each parameter with a value, tolerance and the test method used to verify it.',
    });
  } else if (missing.length && expected.length && ctx.requirements.length <= 2) {
    add({
      type: 'incomplete-field',
      severity: 'low',
      issue: 'Very few technical parameters were provided',
      whyItMatters: 'A short description limits how precisely standards and test requirements can be matched.',
      relatedStandardIds: topIds.slice(0, 1),
      evidence: `Only ${ctx.requirements.length} requirement(s) extracted from the input.`,
      suggestedAction: `Consider adding: ${expected.slice(0, 4).map((e) => e.label).join('; ')}.`,
    });
  }

  // 6. Ambiguous wording
  for (const r of ctx.requirements.filter((x) => x.entity === 'ambiguous phrase')) {
    add({
      type: 'ambiguous-requirement',
      severity: 'medium',
      issue: `Ambiguous requirement wording: ${r.value}`,
      whyItMatters: 'Phrases like this cannot be evaluated objectively and may be challenged by bidders.',
      relatedStandardIds: topIds.slice(0, 1),
      evidence: `Found in input: "${r.sourceSpan ?? r.value}".`,
      suggestedAction: 'Replace with a specific standard number, edition and measurable acceptance criteria.',
    });
  }

  // 7. Missing quantity / warranty for document inputs
  if (isDocument && !has('quantity')) {
    add({ type: 'incomplete-field', severity: 'low', issue: 'Quantity not detected', whyItMatters: 'Quantity affects sampling and testing plans.', relatedStandardIds: [], evidence: 'No quantity pattern (nos/units/km) found in the input.', suggestedAction: 'Consider stating quantities and lot sizes for sampling.' });
  }
  if (isDocument && !has('warranty')) {
    add({ type: 'incomplete-field', severity: 'low', issue: 'Warranty / defect liability not detected', whyItMatters: 'Warranty terms determine post-supply obligations and are often tied to rated life claims.', relatedStandardIds: [], evidence: 'No warranty pattern found in the input.', suggestedAction: 'Consider specifying warranty period and replacement obligations.' });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return gaps.sort((a, b) => order[a.severity] - order[b.severity]);
}

export { RELATIONSHIP_LABELS };
