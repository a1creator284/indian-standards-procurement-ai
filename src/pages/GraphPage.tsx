import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { GitFork, Search, Sparkles } from 'lucide-react';
import type { GraphNode } from '@/engine/types';
import { api } from '@/services/api';
import { useAsyncData, useDebounced } from '@/hooks/useAsyncData';
import { useAnalysisRoute } from '@/hooks/useAnalysisRoute';
import { useStandardDrawer } from '@/hooks/useStandardDrawer';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Button, Card, CardSkeleton, EmptyState, ErrorState } from '@/components/ui';
import { StandardsGraph, GraphLegend } from '@/components/graph/StandardsGraph';
import { StandardDetailDrawer } from '@/components/analysis/StandardDetailDrawer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { CATEGORY_LABELS, CATEGORY_TONE } from '@/components/analysis/labels';

/**
 * Relationship graph page. Shows the graph of the current analysis, or the
 * neighbourhood of a single standard (?standard=<id>) picked from the explorer.
 */
export function GraphPage() {
  const { analysis, loading } = useAnalysisRoute();
  const [params, setParams] = useSearchParams();
  const standardId = params.get('standard');
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim(), 200);
  const drawer = useStandardDrawer();
  const navigate = useNavigate();
  const { data: standardGraph, error } = useAsyncData(standardId, (sid) => api.standard(sid), 'Failed to load the standard graph.');
  const { data: suggestionData } = useAsyncData(debouncedSearch.length >= 2 ? debouncedSearch : null, (q) => api.standards({ q, pageSize: 6 }));
  const suggestions = search.trim().length >= 2 ? (suggestionData?.items ?? []) : [];

  const graph = standardGraph?.graph ?? analysis?.graph ?? null;
  const title = standardGraph ? `${standardGraph.standard.number} neighbourhood` : analysis ? analysis.summary.productDescription : '';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Knowledge graph"
        title="Standards Relationship Graph"
        description="Product → primary standards → normative references, test methods, safety, installation, terminology, allied standards and certification mappings. Zoom, pan, and click a node to focus and inspect it."
        actions={
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Graph a specific standard…" className="h-10 w-64 rounded-lg border border-line bg-surface-sunken pl-9 pr-3 text-[13px] outline-none focus:border-primary" aria-label="Find a standard to graph" />
            {suggestions.length > 0 && (
              <ul className="absolute right-0 z-20 mt-1 w-80 overflow-hidden rounded-lg border border-line bg-surface-overlay shadow-pop">
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => {
                        setParams({ standard: s.id });
                        setSearch('');
                      }}
                      className="w-full px-3 py-2 text-left text-[13px] hover:bg-muted"
                    >
                      <span className="font-mono font-medium">{s.number}</span> <span className="text-ink-muted">— {s.title.slice(0, 60)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        }
      />

      {error && <ErrorState message={error} />}
      {loading && <CardSkeleton lines={6} />}
      {!loading && !graph && (
        <EmptyState
          icon={<GitFork className="size-5" />}
          title="No graph to display yet"
          description="Run an analysis to see the standards ecosystem for a product, or search a standard above to explore its neighbourhood."
          action={
            <Button onClick={() => navigate('/analyze')}>
              <Sparkles className="size-4" /> Analyze a specification
            </Button>
          }
        />
      )}
      {graph && (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-[13px]">
              <span className="font-semibold">{title}</span>
              <Badge tone="slate">{graph.nodes.length} nodes</Badge>
              <Badge tone="slate">{graph.edges.length} edges</Badge>
              {standardGraph && (
                <Button variant="ghost" size="sm" onClick={() => setParams({})} disabled={!analysis}>
                  Back to analysis graph
                </Button>
              )}
            </div>
            <div className="graph-stage">
              <ErrorBoundary label="Graph">
                <StandardsGraph graph={graph} height={620} onSelect={setSelected} />
              </ErrorBoundary>
            </div>
            <GraphLegend />
          </div>
          <aside className="space-y-3">
            <Card className="depth-card p-4">
              <div className="label-caps mb-2">Focused node</div>
              {selected ? (
                <div className="animate-fade-in">
                  <div className="font-mono text-[14px] font-semibold text-ink">{selected.label}</div>
                  {selected.sublabel && <div className="mt-0.5 text-[13px]">{selected.sublabel}</div>}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge tone="navy">{selected.kind}</Badge>
                    {selected.category && <Badge tone={CATEGORY_TONE[selected.category]}>{CATEGORY_LABELS[selected.category]}</Badge>}
                  </div>
                  <div className="mt-3 text-[12.5px] text-ink-muted">
                    {graph.edges.filter((e) => e.source === selected.id || e.target === selected.id).length} connections
                  </div>
                  {selected.standardId && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => drawer.open(selected.standardId!)}>
                        View details
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setParams({ standard: selected.standardId! })}>
                        Re-centre graph
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-ink-muted">Click any node to highlight its neighbourhood and see details here.</p>
              )}
            </Card>
            <Card className="depth-card p-4 text-[12.5px] text-ink-muted">
              <div className="mb-1 font-semibold text-ink">Reading the graph</div>
              Solid navy edges show recommended primary standards. Coloured edges are typed relationships from the indexed dataset. Saffron nodes are certification schemes recorded for a standard.
            </Card>
          </aside>
        </div>
      )}
      <StandardDetailDrawer id={drawer.id} onClose={drawer.close} onNavigate={drawer.open} />
    </div>
  );
}
