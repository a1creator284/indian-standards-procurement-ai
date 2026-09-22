import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Clock3, Download, FileSearch, FileText, Sparkles } from 'lucide-react';
import type { HistoryEntry } from '@/engine/types';
import { historyStore } from '@/services/history';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Button, Card, CardSkeleton, EmptyState } from '@/components/ui';
import { formatDate } from '@/components/analysis/labels';

export function ReportsPage() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);

  useEffect(() => {
    let active = true;
    void historyStore.listMerged().then(({ entries: merged }) => {
      if (active) setEntries(merged);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Reports"
        title="Analysis Reports"
        description="Review past analyses and their outputs. Each analysis generates a report with recommended standards, gap findings, certification mappings, and tender specifications."
      />

      {!entries ? (
        <CardSkeleton lines={4} />
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<FileText className="size-5" />}
          title="No reports yet"
          description="Run your first procurement analysis to generate a report with recommended standards, gaps, and tender specifications."
          action={
            <Link to="/analyze">
              <Button>
                <Sparkles className="size-4" /> Start Analysis
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {entries.map((e) => (
            <Card key={e.id} className="depth-card p-5" hover>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FileSearch className="size-4 text-primary shrink-0" />
                    <Link to={`/results/${e.id}`} className="truncate text-[14px] font-semibold hover:text-primary">
                      {e.query}
                    </Link>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[12px] text-ink-muted">
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3" /> {formatDate(e.createdAt)}
                    </span>
                    <Badge tone={e.mode === 'live' ? 'emerald' : 'amber'}>{e.mode}</Badge>
                    <Badge tone="slate">{e.source}</Badge>
                    <Badge tone="slate">{e.language}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[12.5px]">
                  <div className="text-center">
                    <div className="text-lg font-bold text-ink">{e.recommendationCount}</div>
                    <div className="text-ink-muted">Standards</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-amber-700">{e.gapCount}</div>
                    <div className="text-ink-muted">Gaps</div>
                  </div>
                  {e.topStandard && (
                    <div className="text-center">
                      <div className="font-mono text-[13px] font-semibold">{e.topStandard}</div>
                      <div className="text-ink-muted">Top match</div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to={`/results/${e.id}`}>
                  <Button variant="secondary" size="sm">
                    <FileSearch className="size-3.5" /> View Analysis
                  </Button>
                </Link>
                <Link to={`/gaps/${e.id}`}>
                  <Button variant="secondary" size="sm">
                    Gap Analysis
                  </Button>
                </Link>
                <Link to={`/spec/${e.id}`}>
                  <Button variant="secondary" size="sm">
                    <Download className="size-3.5" /> Tender Spec
                  </Button>
                </Link>
                <Link to={`/graph/${e.id}`}>
                  <Button variant="secondary" size="sm">
                    Relationship Graph
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
