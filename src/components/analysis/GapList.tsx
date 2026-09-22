import { AlertOctagon, AlertTriangle, Info, Lightbulb } from 'lucide-react';
import type { GapFinding, Recommendation } from '@/engine/types';
import { Badge, EmptyState } from '@/components/ui';
import { GAP_TYPE_LABELS, SEVERITY_TONE } from './labels';

const ICON = { high: AlertOctagon, medium: AlertTriangle, low: Info } as const;

export function GapCard({ gap, lookup, onOpenStandard }: { gap: GapFinding; lookup: Map<string, Recommendation>; onOpenStandard: (id: string) => void }) {
  const Icon = ICON[gap.severity];
  const related = gap.relatedStandardIds.map((id) => lookup.get(id)).filter((r): r is Recommendation => Boolean(r));
  return (
    <article className="card p-5 animate-fade-up">
      <div className="flex items-start gap-3">
        <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${gap.severity === 'high' ? 'bg-rose-50 text-rose-600' : gap.severity === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
          <Icon className="size-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={SEVERITY_TONE[gap.severity]}>{gap.severity} priority</Badge>
            <Badge tone="slate">{GAP_TYPE_LABELS[gap.type]}</Badge>
            <Badge tone="amber">Potential gap</Badge>
          </div>
          <h3 className="mt-1.5 text-[15px] font-semibold">{gap.issue}</h3>
          <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-2">
            <div>
              <dt className="label-caps mb-1">Why it matters</dt>
              <dd>{gap.whyItMatters}</dd>
            </div>
            <div>
              <dt className="label-caps mb-1">Evidence</dt>
              <dd className="text-ink-muted">{gap.evidence}</dd>
            </div>
            <div>
              <dt className="label-caps mb-1">Related standards</dt>
              <dd>
                {related.length ? (
                  <ul className="space-y-0.5">
                    {related.map((r) => (
                      <li key={r.standard.id}>
                        <button onClick={() => onOpenStandard(r.standard.id)} className="text-left hover:text-primary">
                          <span className="font-mono font-medium">{r.standard.number}</span> <span className="text-ink-muted">— {r.standard.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-ink-muted">—</span>
                )}
              </dd>
            </div>
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
              <dt className="label-caps mb-1 flex items-center gap-1 text-emerald-800">
                <Lightbulb className="size-3.5" /> Suggested action
              </dt>
              <dd className="text-emerald-900">{gap.suggestedAction}</dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  );
}

export function GapList({ gaps, lookup, onOpenStandard }: { gaps: GapFinding[]; lookup: Map<string, Recommendation>; onOpenStandard: (id: string) => void }) {
  if (!gaps.length) return <EmptyState title="No potential gaps flagged" description="The rule engine did not find missing standards, tests, safety, installation or certification requirements for this input." />;
  return (
    <div className="space-y-3">
      {gaps.map((g) => (
        <GapCard key={g.id} gap={g} lookup={lookup} onOpenStandard={onOpenStandard} />
      ))}
    </div>
  );
}
