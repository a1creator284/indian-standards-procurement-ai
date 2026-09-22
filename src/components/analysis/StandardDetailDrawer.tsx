import { FileBadge2, Link2 } from 'lucide-react';
import { api } from '@/services/api';
import { useAsyncData } from '@/hooks/useAsyncData';
import { RELATIONSHIP_LABELS } from '@/engine/graph/expand';
import { APPLICABILITY_LABELS, NO_CERTIFICATION_MESSAGE } from '@/engine/analysis/certifications';
import { Badge, Drawer, ErrorState, Skeleton } from '@/components/ui';
import { SourceBadge } from './EvidenceList';
import { CATEGORY_LABELS, CATEGORY_TONE, RELATIONSHIP_TONE, SECTOR_LABELS } from './labels';

/**
 * Detail panel for a single standard — fetched by id so it works from any
 * page (results, explorer, graph). Navigating between related standards stays inside the drawer.
 */
export function StandardDetailDrawer({ id, onClose, onNavigate }: { id: string | null; onClose: () => void; onNavigate: (id: string) => void }) {
  const { data, error, loading, reload } = useAsyncData(id, (sid) => api.standard(sid), 'Failed to load standard.');

  const s = data?.standard;
  const groups = new Map<string, NonNullable<typeof data>['relationships']>();
  for (const r of data?.relationships ?? []) groups.set(r.type, [...(groups.get(r.type) ?? []), r]);

  return (
    <Drawer
      open={Boolean(id)}
      onClose={onClose}
      title={
        s ? (
          <div>
            <div className="font-mono text-[15px] font-semibold text-ink">{s.number}</div>
            <div className="text-[13px] text-ink-muted line-clamp-1">{s.title}</div>
          </div>
        ) : (
          <Skeleton className="h-5 w-40" />
        )
      }
    >
      {loading && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
      {error && <ErrorState message={error} onRetry={reload} />}
      {s && (
        <div className="space-y-5 animate-fade-in">
          <div className="flex flex-wrap gap-2">
            <Badge tone={CATEGORY_TONE[s.category]}>{CATEGORY_LABELS[s.category]}</Badge>
            <Badge tone="slate">{SECTOR_LABELS[s.sector]}</Badge>
            <Badge tone={s.revisionStatus === 'superseded' ? 'rose' : s.revisionStatus === 'indexed-current' ? 'emerald' : 'slate'}>{s.revisionStatus.replace('-', ' ')}</Badge>
            {s.isDemo && <Badge tone="amber">Demo dataset</Badge>}
          </div>

          <section>
            <h4 className="label-caps mb-1">Scope summary (representative)</h4>
            <p className="text-[13.5px]">{s.scope}</p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="label-caps mb-1">Versions</h4>
              <ul className="text-[13px] space-y-1">
                {s.versions.map((v) => (
                  <li key={v.label} className="flex items-center gap-2">
                    <span className="font-mono">{v.label}</span>
                    <Badge tone={v.status === 'indexed-current' ? 'emerald' : v.status === 'superseded' ? 'rose' : 'slate'}>{v.status.replace('-', ' ')}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="label-caps mb-1">Amendments</h4>
              {s.amendments.length ? (
                <ul className="text-[13px] space-y-1">
                  {s.amendments.map((a) => (
                    <li key={a.number}>
                      Amendment {a.number}
                      {a.year ? ` (${a.year})` : ''} — <span className="text-ink-muted">{a.summary}</span>
                      {a.isPlaceholder && <Badge tone="amber" className="ml-1">placeholder</Badge>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-ink-muted">No amendment records indexed.</p>
              )}
            </div>
          </section>

          <section>
            <h4 className="label-caps mb-1">Product types &amp; keywords</h4>
            <div className="flex flex-wrap gap-1.5">
              {s.productTypes.map((p) => (
                <Badge key={p} tone="navy" className="normal-case font-medium">
                  {p}
                </Badge>
              ))}
              {s.keywords.map((k) => (
                <Badge key={k} tone="slate" className="normal-case font-medium">
                  {k}
                </Badge>
              ))}
            </div>
          </section>

          <section>
            <h4 className="label-caps mb-2">Certification (indexed)</h4>
            {data!.certifications.length ? (
              <ul className="space-y-2">
                {data!.certifications.map((c) => (
                  <li key={c.certification.id} className="rounded-lg border border-saffron-200 bg-saffron-50 p-3 text-[13px]">
                    <div className="flex items-center gap-2 font-medium text-saffron-700">
                      <FileBadge2 className="size-4" /> {c.certification.name}
                    </div>
                    <div className="mt-0.5 text-[12px] text-ink-muted">{APPLICABILITY_LABELS[c.applicability]} · {c.evidence}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-muted">{NO_CERTIFICATION_MESSAGE}</p>
            )}
          </section>

          <section>
            <h4 className="label-caps mb-2">Relationships</h4>
            {groups.size ? (
              <div className="space-y-3">
                {[...groups.entries()].map(([type, list]) => (
                  <div key={type}>
                    <Badge tone={RELATIONSHIP_TONE[type as keyof typeof RELATIONSHIP_TONE]} className="mb-1.5">
                      <Link2 className="size-3" /> {RELATIONSHIP_LABELS[type as keyof typeof RELATIONSHIP_LABELS]}
                    </Badge>
                    <ul className="space-y-1">
                      {list.map((r) => (
                        <li key={`${r.standard.id}-${r.direction}`}>
                          <button onClick={() => onNavigate(r.standard.id)} className="group text-left text-[13px] hover:text-primary">
                            <span className="font-mono font-medium">{r.standard.number}</span> <span className="text-ink-muted group-hover:text-primary/80">— {r.standard.title}</span>
                            {r.note && <span className="block text-[11.5px] text-ink-muted">{r.note}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-ink-muted">No relationships indexed for this standard.</p>
            )}
          </section>

          <section>
            <h4 className="label-caps mb-1">Source</h4>
            <SourceBadge source={s.source} />
            {s.source.note && <p className="mt-1 text-[11.5px] text-ink-muted">{s.source.note}</p>}
          </section>
        </div>
      )}
    </Drawer>
  );
}
