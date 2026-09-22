import { useState } from 'react';
import { ChevronDown, ExternalLink, FileBadge2, Link2, ShieldCheck } from 'lucide-react';
import type { Recommendation, Requirement } from '@/engine/types';
import { RELATIONSHIP_LABELS } from '@/engine/graph/expand';
import { APPLICABILITY_LABELS } from '@/engine/analysis/certifications';
import { Badge, cx } from '@/components/ui';
import { ConfidenceMeter, ConfidencePill } from './ConfidenceMeter';
import { CATEGORY_LABELS, CATEGORY_TONE, RELATIONSHIP_TONE, SECTOR_LABELS } from './labels';
import { EvidenceList } from './EvidenceList';

export function RecommendationCard({
  rec,
  rank,
  requirements,
  onOpenStandard,
  defaultOpen = false,
}: {
  rec: Recommendation;
  rank?: number;
  requirements: Requirement[];
  onOpenStandard: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const s = rec.standard;
  const matched = requirements.filter((r) => rec.matchedRequirementIds.includes(r.id));
  const groups = new Map<string, Recommendation['relationships']>();
  for (const r of rec.relationships) groups.set(r.type, [...(groups.get(r.type) ?? []), r]);

  return (
    <article className={cx('card card-hover overflow-hidden animate-fade-up', open && 'ring-1 ring-primary/30')} style={{ animationDelay: `${(rank ?? 0) * 40}ms` }}>
      <button className="w-full text-left p-5" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div className="flex items-start gap-4">
          {rank !== undefined && (
            <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary font-mono text-[13px] font-semibold text-primary-fg">{rank + 1}</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[15px] font-semibold text-ink">{s.number}</span>
              <ConfidencePill c={rec.confidence} />
              <Badge tone={CATEGORY_TONE[s.category]}>{CATEGORY_LABELS[s.category]}</Badge>
              <Badge tone="slate">{SECTOR_LABELS[s.sector]}</Badge>
              {s.isDemo && <Badge tone="amber">Demo dataset</Badge>}
              {rec.certifications.length > 0 && (
                <Badge tone="saffron">
                  <ShieldCheck className="size-3" /> {rec.certifications.map((c) => c.certification.scheme).join(', ')}
                </Badge>
              )}
            </div>
            <h3 className="mt-1.5 text-[15px] font-semibold leading-snug">{s.title}</h3>
            <p className="mt-1.5 text-[13px] text-ink-muted line-clamp-2">{rec.explanation}</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-muted">
              <span>Latest indexed: <span className="font-medium text-ink">{s.latestVersion.label}</span></span>
              <span>{rec.relationships.length} related</span>
              <span>{matched.length} requirement match{matched.length === 1 ? '' : 'es'}</span>
              <span>{rec.evidence.length} evidence item{rec.evidence.length === 1 ? '' : 's'}</span>
            </div>
          </div>
          <ChevronDown className={cx('size-5 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className="border-t border-line bg-surface/60 p-5 space-y-5 animate-fade-in">
          <ConfidenceMeter c={rec.confidence} showBreakdown />

          <section>
            <h4 className="label-caps mb-2">Why it is relevant</h4>
            <ul className="space-y-1.5">
              {rec.reasons.map((r, i) => (
                <li key={i} className="flex gap-2 text-[13px]">
                  <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </section>

          {matched.length > 0 && (
            <section>
              <h4 className="label-caps mb-2">Matching requirements from your input</h4>
              <div className="flex flex-wrap gap-1.5">
                {matched.map((r) => (
                  <Badge key={r.id} tone="navy" className="font-medium normal-case">
                    {r.text}
                  </Badge>
                ))}
              </div>
            </section>
          )}

          <section>
            <h4 className="label-caps mb-2">Scope summary (indexed)</h4>
            <p className="text-[13px]">{s.scope}</p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="label-caps mb-2">Version &amp; freshness</h4>
              <dl className="text-[13px] space-y-1">
                <Row k="Latest indexed edition" v={s.latestVersion.label} />
                <Row k="Revision status" v={rec.freshness.note} />
                <Row k="Amendments indexed" v={s.amendments.length ? `${s.amendments.length}${s.amendments.some((a) => a.isPlaceholder) ? ' (placeholder records)' : ''}` : 'None recorded'} />
                {s.versions.length > 1 && <Row k="Edition history" v={s.versions.map((v) => v.label).join(' → ')} />}
              </dl>
            </div>
            <div>
              <h4 className="label-caps mb-2">Certification (indexed)</h4>
              {rec.certifications.length ? (
                <ul className="space-y-2 text-[13px]">
                  {rec.certifications.map((c) => (
                    <li key={c.certification.id} className="rounded-lg border border-saffron-200 bg-saffron-50/50 dark:border-saffron-900 dark:bg-saffron-900/20 p-2.5">
                      <div className="flex items-center gap-2 font-medium text-saffron-700 dark:text-saffron-400">
                        <FileBadge2 className="size-4" /> {c.certification.name}
                      </div>
                      <div className="mt-0.5 text-[12px] text-ink-muted">{APPLICABILITY_LABELS[c.applicability]} · {c.evidence}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-ink-muted">No verified certification mapping found in the indexed dataset.</p>
              )}
            </div>
          </section>

          {groups.size > 0 && (
            <section>
              <h4 className="label-caps mb-2">Related &amp; allied standards</h4>
              <div className="grid gap-2 sm:grid-cols-2">
                {[...groups.entries()].map(([type, list]) => (
                  <div key={type} className="rounded-lg border border-line bg-surface-raised p-3 shadow-sm">
                    <Badge tone={RELATIONSHIP_TONE[type as keyof typeof RELATIONSHIP_TONE]} className="mb-2">
                      <Link2 className="size-3" /> {RELATIONSHIP_LABELS[type as keyof typeof RELATIONSHIP_LABELS]}
                    </Badge>
                    <ul className="space-y-1">
                      {list.map((r) => (
                        <li key={r.standard.id}>
                          <button onClick={() => onOpenStandard(r.standard.id)} className="group text-left text-[13px] hover:text-primary">
                            <span className="font-mono font-medium">{r.standard.number}</span> <span className="text-ink-muted group-hover:text-primary/80">— {r.standard.title}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h4 className="label-caps mb-2">Evidence &amp; source</h4>
            <EvidenceList evidence={rec.evidence} source={s.source} />
          </section>

          <div className="flex justify-end">
            <button onClick={() => onOpenStandard(s.id)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary hover:underline">
              Open standard details <ExternalLink className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-40 shrink-0 text-ink-muted">{k}</dt>
      <dd className="min-w-0">{v}</dd>
    </div>
  );
}
