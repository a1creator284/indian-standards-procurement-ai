import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { ShieldAlert, Sparkles } from 'lucide-react';
import type { GapSeverity, Recommendation } from '@/engine/types';
import { useAnalysisRoute } from '@/hooks/useAnalysisRoute';
import { useStandardDrawer } from '@/hooks/useStandardDrawer';
import { PageHeader } from '@/components/PageHeader';
import { Button, Card, CardSkeleton, DisclaimerBar, EmptyState, Tabs, cx } from '@/components/ui';
import { GapList } from '@/components/analysis/GapList';
import { OutdatedTable } from '@/components/analysis/OutdatedTable';
import { StandardDetailDrawer } from '@/components/analysis/StandardDetailDrawer';
import { GAP_TYPE_LABELS } from '@/components/analysis/labels';

export function GapsPage() {
  const { analysis, loading } = useAnalysisRoute();
  const drawer = useStandardDrawer();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'gaps' | 'outdated'>('gaps');
  const [severity, setSeverity] = useState<GapSeverity | 'all'>('all');

  const lookup = useMemo(() => {
    const m = new Map<string, Recommendation>();
    for (const r of [...(analysis?.recommendations ?? []), ...(analysis?.related ?? [])]) m.set(r.standard.id, r);
    return m;
  }, [analysis]);

  if (loading) return <CardSkeleton lines={6} />;
  if (!analysis) {
    return (
      <EmptyState
        icon={<ShieldAlert className="size-5" />}
        title="No analysis to review"
        description="Run an analysis or upload a tender to detect missing standards, tests, safety, installation and certification clauses, and potentially outdated references."
        action={
          <Button onClick={() => navigate('/analyze')}>
            <Sparkles className="size-4" /> Analyze a specification
          </Button>
        }
      />
    );
  }

  const counts = { high: 0, medium: 0, low: 0 } as Record<GapSeverity, number>;
  for (const g of analysis.gaps) counts[g.severity]++;
  const byType = new Map<string, number>();
  for (const g of analysis.gaps) byType.set(g.type, (byType.get(g.type) ?? 0) + 1);
  const gaps = severity === 'all' ? analysis.gaps : analysis.gaps.filter((g) => g.severity === severity);
  const flagged = analysis.outdated.filter((o) => o.status === 'potentially-outdated' || o.status === 'superseded').length;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Gap analyzer" title="Tender Gap Analysis" description={`${analysis.summary.productDescription} — ${analysis.gaps.length} potential gap(s) and ${flagged} outdated reference(s) detected.`} />

      <div className="grid gap-3 sm:grid-cols-4">
        {(['high', 'medium', 'low'] as GapSeverity[]).map((s) => (
          <button key={s} onClick={() => setSeverity(severity === s ? 'all' : s)} className={cx('card depth-card card-hover p-4 text-left', severity === s && 'ring-2 ring-primary')}>
            <div className="label-caps">{s} priority</div>
            <div className={cx('mt-1 text-2xl font-bold', s === 'high' ? 'text-signal-risk' : s === 'medium' ? 'text-amber-500' : 'text-muted-fg')}>{counts[s]}</div>
          </button>
        ))}
        <Card className="depth-card p-4">
          <div className="label-caps">By type</div>
          <ul className="mt-1 space-y-0.5 text-[12px]">
            {[...byType.entries()].slice(0, 4).map(([t, n]) => (
              <li key={t} className="flex justify-between">
                <span className="text-ink-muted">{GAP_TYPE_LABELS[t as keyof typeof GAP_TYPE_LABELS]}</span>
                <span className="font-mono">{n}</span>
              </li>
            ))}
            {!byType.size && <li className="text-ink-muted">—</li>}
          </ul>
        </Card>
      </div>

      <div className="surface-strip px-2">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'gaps', label: 'Potential gaps', count: analysis.gaps.length },
            { id: 'outdated', label: 'Outdated reference check', count: analysis.outdated.length },
          ]}
        />
      </div>
      <DisclaimerBar text="Findings are potential issues detected against indexed metadata. Wording such as “potential gap” and “consider reviewing” is intentional — nothing here establishes a legal obligation." />

      {tab === 'gaps' && <GapList gaps={gaps} lookup={lookup} onOpenStandard={drawer.open} />}
      {tab === 'outdated' && <OutdatedTable items={analysis.outdated} onOpenStandard={drawer.open} />}

      <StandardDetailDrawer id={drawer.id} onClose={drawer.close} onNavigate={drawer.open} />
    </div>
  );
}
