import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Clock3, Cloud, HardDrive, Search, Trash2 } from 'lucide-react';
import type { HistoryEntry } from '@/engine/types';
import { historyStore } from '@/services/history';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Button, CardSkeleton, EmptyState } from '@/components/ui';
import { formatDate } from '@/components/analysis/labels';

export function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [persisted, setPersisted] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'date' | 'gaps'>('date');

  const load = () =>
    historyStore.listMerged().then((r) => {
      setEntries(r.entries);
      setPersisted(r.persisted);
    });
  useEffect(() => {
    void load();
  }, []);

  const remove = (id: string) => {
    historyStore.remove(id);
    setEntries((e) => e?.filter((x) => x.id !== id) ?? null);
  };

  const filtered = entries
    ?.filter((e) => search.trim() === '' || e.query.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'gaps') return (b.gapCount ?? 0) - (a.gapCount ?? 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="History"
        title="Search History"
        description="Previous analyses with their top standard and gap count. Reopen any analysis to review recommendations, the graph or the generated specification."
        actions={
          <>
            <Badge tone={persisted ? 'emerald' : 'slate'}>{persisted ? <Cloud className="size-3" /> : <HardDrive className="size-3" />} {persisted ? 'Synced with Supabase' : 'Stored in this browser'}</Badge>
            {entries?.length ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (confirm('Clear local search history?')) {
                    historyStore.clear();
                    void load();
                  }
                }}
              >
                <Trash2 className="size-3.5" /> Clear local
              </Button>
            ) : null}
          </>
        }
      />
      {!entries && <CardSkeleton lines={4} />}
      {entries && !entries.length && <EmptyState icon={<Clock3 className="size-5" />} title="No searches yet" description="Analyses you run will appear here." action={<Link to="/analyze"><Button>Analyze a specification</Button></Link>} />}
      {entries && entries.length > 0 && (
        <div className="space-y-3">
          <div className="surface-strip flex flex-wrap items-center gap-2 p-3">
            <label className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search history…"
                className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13px] outline-none focus:border-primary focus:bg-surface-sunken"
              />
            </label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as 'date' | 'gaps')}
              className="h-10 rounded-lg border border-line bg-surface px-3 text-[13px] outline-none focus:border-primary"
            >
              <option value="date">Sort: Date (newest)</option>
              <option value="gaps">Sort: Most gaps</option>
            </select>
          </div>
          <div className="card depth-card overflow-x-auto">
            <table className="w-full min-w-[760px] text-[13px]">
              <thead className="bg-surface-raised text-left">
              <tr className="[&>th]:px-4 [&>th]:py-2.5 [&>th]:label-caps">
                <th>Query</th>
                <th>Date / time</th>
                <th>Recommendations</th>
                <th>Top standard</th>
                <th>Gaps</th>
                <th>Mode</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map((e) => (
                <tr key={e.id} className="border-t border-line align-middle [&>td]:px-4 [&>td]:py-3 hover:bg-surface-sunken">
                  <td className="max-w-sm">
                    <Link to={`/results/${e.id}`} className="line-clamp-2 font-medium hover:text-primary">
                      {e.query}
                    </Link>
                    <div className="mt-0.5 flex gap-1.5">
                      <Badge tone="slate">{e.source}</Badge>
                      <Badge tone="slate">{e.language}</Badge>
                    </div>
                  </td>
                  <td className="whitespace-nowrap text-ink-muted">{formatDate(e.createdAt)}</td>
                  <td className="font-mono">{e.recommendationCount}</td>
                  <td className="font-mono">{e.topStandard ?? '—'}</td>
                  <td>
                    <Badge tone={e.gapCount ? 'amber' : 'emerald'}>{e.gapCount}</Badge>
                  </td>
                  <td>
                    <Badge tone={e.mode === 'live' ? 'emerald' : 'amber'}>{e.mode}</Badge>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <Link to={`/results/${e.id}`} className="mr-2 text-[12.5px] font-medium text-primary hover:underline">
                      Reopen
                    </Link>
                    <button onClick={() => remove(e.id)} className="text-[12.5px] text-ink-muted hover:text-rose-600" aria-label="Delete entry">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered?.length === 0 && <div className="p-8 text-center text-[13px] text-ink-muted">No history matches your search.</div>}
        </div>
      </div>
      )}
    </div>
  );
}
