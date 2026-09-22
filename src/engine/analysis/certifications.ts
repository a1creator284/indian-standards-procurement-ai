import type { CertificationFinding, Standard } from '../types';
import type { StandardsRepository } from '../repository/types';

export const NO_CERTIFICATION_MESSAGE = 'No verified certification mapping found in the indexed dataset.';

/** Collects indexed certification mappings for a set of standards. Never infers new ones. */
export async function findCertifications(standards: Standard[], repo: StandardsRepository): Promise<CertificationFinding[]> {
  const ids = standards.map((s) => s.id);
  const [mappings, certs] = await Promise.all([repo.getStandardCertificationsFor(ids), repo.getCertifications()]);
  const certById = new Map(certs.map((c) => [c.id, c]));
  const stdById = new Map(standards.map((s) => [s.id, s]));
  const findings: CertificationFinding[] = [];
  for (const m of mappings) {
    const cert = certById.get(m.certificationId);
    const std = stdById.get(m.standardId);
    if (!cert || !std) continue;
    findings.push({
      standardId: std.id,
      standardNumber: std.number,
      certification: cert,
      applicability: m.applicability,
      evidence: m.evidence,
      status: m.status,
      source: m.source,
    });
  }
  const order = { 'indexed-mandatory': 0, 'indexed-listed': 1, 'indexed-voluntary': 2, unknown: 3 } as const;
  return findings.sort((a, b) => order[a.applicability] - order[b.applicability]);
}

export const APPLICABILITY_LABELS: Record<CertificationFinding['applicability'], string> = {
  'indexed-mandatory': 'Indexed as mandatory',
  'indexed-listed': 'Indexed as listed / notified',
  'indexed-voluntary': 'Indexed as voluntary',
  unknown: 'Applicability not recorded',
};
