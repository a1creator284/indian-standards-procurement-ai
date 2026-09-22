import { FileBadge2, ShieldCheck } from 'lucide-react';
import type { CertificationFinding } from '@/engine/types';
import { APPLICABILITY_LABELS, NO_CERTIFICATION_MESSAGE } from '@/engine/analysis/certifications';
import { Badge, EmptyState } from '@/components/ui';
import { SourceBadge } from './EvidenceList';

const TONE = { 'indexed-mandatory': 'rose', 'indexed-listed': 'saffron', 'indexed-voluntary': 'sky', unknown: 'slate' } as const;

export function CertificationPanel({ items, primaryIds, onOpenStandard }: { items: CertificationFinding[]; primaryIds: Set<string>; onOpenStandard: (id: string) => void }) {
  const primary = items.filter((c) => primaryIds.has(c.standardId));
  const related = items.filter((c) => !primaryIds.has(c.standardId));
  if (!items.length) return <EmptyState icon={<ShieldCheck className="size-5" />} title={NO_CERTIFICATION_MESSAGE} description="Certification mappings are only shown when the indexed dataset records one. Nothing is inferred." />;

  const render = (list: CertificationFinding[]) => (
    <ul className="grid gap-3 md:grid-cols-2">
      {list.map((c) => (
        <li key={`${c.standardId}-${c.certification.id}`} className="card p-4 animate-fade-up">
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-saffron-50 text-saffron-600">
              <FileBadge2 className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => onOpenStandard(c.standardId)} className="font-mono font-semibold text-ink hover:underline">
                  {c.standardNumber}
                </button>
                <Badge tone={TONE[c.applicability]}>{APPLICABILITY_LABELS[c.applicability]}</Badge>
                <Badge tone="slate">{c.status === 'verified-demo' ? 'Demo record' : c.status}</Badge>
              </div>
              <div className="mt-1 text-[14px] font-medium">{c.certification.name}</div>
              <div className="text-[12px] text-ink-muted">{c.certification.authority}</div>
              <p className="mt-2 text-[13px]">{c.evidence}</p>
              <div className="mt-2">
                <SourceBadge source={c.source} />
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      {primary.length ? (
        <section>
          <h3 className="label-caps mb-2">For recommended standards</h3>
          {render(primary)}
        </section>
      ) : (
        <p className="text-[13px] text-ink-muted">{NO_CERTIFICATION_MESSAGE.replace('.', '')} for the primary recommendations.</p>
      )}
      {related.length > 0 && (
        <section>
          <h3 className="label-caps mb-2">For related standards</h3>
          {render(related)}
        </section>
      )}
      <p className="text-[11px] text-ink-muted">Applicability labels describe what the index records — they are not a legal determination. Verify with BIS and the relevant Quality Control Order before use.</p>
    </div>
  );
}
