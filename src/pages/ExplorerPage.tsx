import { useMemo, useState } from 'react';
import { BookOpenText, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react';
import type { StandardsQuery } from '@/engine/repository/types';
import { api } from '@/services/api';
import { useAsyncData, useDebounced } from '@/hooks/useAsyncData';
import { useStandardDrawer } from '@/hooks/useStandardDrawer';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Button, Card, CardSkeleton, EmptyState, ErrorState, cx } from '@/components/ui';
import { StandardDetailDrawer } from '@/components/analysis/StandardDetailDrawer';
import { CATEGORY_LABELS, CATEGORY_TONE, SECTOR_LABELS } from '@/components/analysis/labels';

const PAGE_SIZE = 12;

export function ExplorerPage() {
  const [filters, setQuery] = useState<StandardsQuery>({ page: 1, pageSize: PAGE_SIZE, sort: 'number' });
  const [input, setInput] = useState('');
  const debouncedInput = useDebounced(input, 250);
  const [showFilters, setShowFilters] = useState(false);
  const drawer = useStandardDrawer();
  const query = useMemo<StandardsQuery>(() => ({ ...filters, q: debouncedInput, page: debouncedInput !== (filters.q ?? '') ? 1 : filters.page }), [filters, debouncedInput]);
  const { data: facets } = useAsyncData('facets', () => api.facets());
  const { data, loading, error, reload } = useAsyncData(JSON.stringify(query), () => api.standards(query), 'Failed to load standards.');

  const set = (patch: Partial<StandardsQuery>) => setQuery((q) => ({ ...q, ...patch, q: debouncedInput, page: 1 }));
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const activeFilters = ['category', 'sector', 'revisionStatus', 'certification', 'productType'].filter((k) => query[k as keyof StandardsQuery]).length;

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Explorer" title="Standards Explorer" description={`Browse and filter the indexed dataset${facets ? ` (${facets.total} standards)` : ''}. Select a standard to inspect its scope, versions, relationships and certification mappings.`} />

      <Card className="depth-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search by number, title, keyword… e.g. 10322, cable, IP code"
              className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-[13.5px] outline-none focus:border-primary focus:bg-surface-raised"
              aria-label="Search standards"
            />
          </label>
          <select value={query.sort} onChange={(e) => set({ sort: e.target.value as StandardsQuery['sort'] })} className="h-10 rounded-lg border border-line bg-surface-raised px-3 text-[13px]" aria-label="Sort">
            <option value="number">Sort: Number</option>
            <option value="title">Sort: Title</option>
            <option value="year">Sort: Latest edition</option>
          </select>
          <Button variant="secondary" onClick={() => setShowFilters((s) => !s)}>
            <SlidersHorizontal className="size-4" /> Filters {activeFilters ? <Badge tone="navy">{activeFilters}</Badge> : null}
          </Button>
        </div>
        {showFilters && facets && (
          <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2 lg:grid-cols-5 animate-fade-in">
            <Select label="Category" value={query.category ?? ''} onChange={(v) => set({ category: (v || undefined) as StandardsQuery['category'] })} options={facets.categories.map((c) => ({ value: c.value, label: `${CATEGORY_LABELS[c.value as keyof typeof CATEGORY_LABELS] ?? c.value} (${c.count})` }))} />
            <Select label="Sector" value={query.sector ?? ''} onChange={(v) => set({ sector: (v || undefined) as StandardsQuery['sector'] })} options={facets.sectors.map((c) => ({ value: c.value, label: `${SECTOR_LABELS[c.value as keyof typeof SECTOR_LABELS] ?? c.value} (${c.count})` }))} />
            <Select label="Revision status" value={query.revisionStatus ?? ''} onChange={(v) => set({ revisionStatus: v || undefined })} options={facets.revisionStatuses.map((c) => ({ value: c.value, label: `${c.value.replace('-', ' ')} (${c.count})` }))} />
            <Select label="Certification" value={query.certification ?? ''} onChange={(v) => set({ certification: v || undefined })} options={facets.certifications.map((c) => ({ value: c.value, label: c.label }))} />
            <label className="text-[12px]">
              <span className="label-caps block mb-1">Product type</span>
              <input value={query.productType ?? ''} onChange={(e) => set({ productType: e.target.value || undefined })} placeholder="e.g. luminaire" className="h-9 w-full rounded-lg border border-line bg-surface-sunken px-2.5 text-[13px] outline-none focus:border-primary" />
            </label>
          </div>
        )}
      </Card>

      {error && <ErrorState message={error} onRetry={reload} />}
      {loading && !data && (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      )}
      {data && !data.items.length && !loading && <EmptyState icon={<BookOpenText className="size-5" />} title="No standards match" description="Try a different keyword or clear some filters." />}
      {data && data.items.length > 0 && (
        <div className={cx('grid gap-3 md:grid-cols-2 transition-opacity', loading && 'opacity-60')}>
          {data.items.map((s, i) => (
            <button key={s.id} onClick={() => drawer.open(s.id)} className="card depth-card card-hover p-4 text-left animate-fade-up" style={{ animationDelay: `${i * 25}ms` }}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[14px] font-semibold text-ink">{s.number}</span>
                <Badge tone={CATEGORY_TONE[s.category]}>{CATEGORY_LABELS[s.category]}</Badge>
                <Badge tone="slate">{SECTOR_LABELS[s.sector]}</Badge>
                {s.revisionStatus === 'superseded' && <Badge tone="rose">superseded</Badge>}
              </div>
              <div className="mt-1 text-[13.5px] font-medium leading-snug">{s.title}</div>
              <div className="mt-1.5 line-clamp-2 text-[12.5px] text-ink-muted">{s.scope}</div>
              <div className="mt-2 flex items-center gap-2 text-[11.5px] text-ink-muted">
                <span>{s.latestVersion.label}</span>
                <span>·</span>
                <span>{s.productTypes.slice(0, 2).join(', ')}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {data && data.total > PAGE_SIZE && (
        <div className="flex items-center justify-between text-[13px]">
          <span className="text-ink-muted">
            Showing {(query.page! - 1) * PAGE_SIZE + 1}–{Math.min(query.page! * PAGE_SIZE, data.total)} of {data.total}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" disabled={query.page === 1} onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) - 1 }))}>
              <ChevronLeft className="size-4" /> Prev
            </Button>
            <span className="px-2 font-mono">
              {query.page} / {totalPages}
            </span>
            <Button variant="secondary" size="sm" disabled={query.page === totalPages} onClick={() => setQuery((q) => ({ ...q, page: (q.page ?? 1) + 1 }))}>
              Next <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <StandardDetailDrawer id={drawer.id} onClose={drawer.close} onNavigate={drawer.open} />
    </div>
  );
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="text-[12px]">
      <span className="label-caps block mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-line bg-surface-sunken px-2.5 text-[13px] outline-none focus:border-primary">
        <option value="">All</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
