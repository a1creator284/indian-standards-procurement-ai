import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookCheck,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Copy,
  FileSearch,
  FileText,
  GitFork,
  Globe,
  History,
  Languages,
  Network,
  ShieldAlert,
  Sparkles,
  Timer,
} from 'lucide-react';
import type { AnalysisResult, Recommendation } from '@/engine/types';
import { useAnalysisRoute } from '@/hooks/useAnalysisRoute';
import { useStandardDrawer } from '@/hooks/useStandardDrawer';
import { PageHeader } from '@/components/PageHeader';
import { Badge, Button, Card, CardSkeleton, DisclaimerBar, EmptyState, Tabs, cx } from '@/components/ui';
import { RecommendationCard } from '@/components/analysis/RecommendationCard';
import { RequirementChips } from '@/components/analysis/RequirementChips';
import { GapList } from '@/components/analysis/GapList';
import { OutdatedTable } from '@/components/analysis/OutdatedTable';
import { CertificationPanel } from '@/components/analysis/CertificationPanel';
import { EvidenceList } from '@/components/analysis/EvidenceList';
import { StandardDetailDrawer } from '@/components/analysis/StandardDetailDrawer';
import { StandardsGraph, GraphLegend } from '@/components/graph/StandardsGraph';
import { ConfidenceMeter, ConfidencePill } from '@/components/analysis/ConfidenceMeter';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { formatDate, SECTOR_LABELS } from '@/components/analysis/labels';

type Tab = 'recommended' | 'related' | 'certification' | 'gaps' | 'outdated' | 'evidence' | 'graph';

export function ResultsPage() {
  const { analysis, loading, notFound } = useAnalysisRoute();
  const drawer = useStandardDrawer();
  const [tab, setTab] = useState<Tab>('recommended');
  const navigate = useNavigate();

  const lookup = useMemo(() => {
    const m = new Map<string, Recommendation>();
    for (const r of [...(analysis?.recommendations ?? []), ...(analysis?.related ?? [])]) m.set(r.standard.id, r);
    return m;
  }, [analysis]);

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton lines={2} />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }
  if (notFound || !analysis) {
    return (
      <EmptyState
        icon={<FileSearch className="size-5" />}
        title={notFound ? 'Analysis not found' : 'No analysis yet'}
        description={notFound ? 'This analysis is not stored in your browser or on the server.' : 'Describe a product or upload a tender to see recommendations, related standards, certification, gaps and the knowledge graph.'}
        action={
          <Button onClick={() => navigate('/analyze')}>
            <Sparkles className="size-4" /> Analyze a specification
          </Button>
        }
      />
    );
  }

  const a = analysis;
  const primaryIds = new Set(a.recommendations.map((r) => r.standard.id));
  const outdatedFlagged = a.outdated.filter((o) => o.status === 'potentially-outdated' || o.status === 'superseded').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recommendations"
        title="Analysis results"
        description={a.summary.headline}
        actions={
          <>
            <Link to={`/graph/${a.id}`}>
              <Button variant="secondary">
                <GitFork className="size-4" /> Open graph
              </Button>
            </Link>
            <Link to={`/spec/${a.id}`}>
              <Button variant="accent">
                <FileText className="size-4" /> Generate Standards-Ready Specification
              </Button>
            </Link>
          </>
        }
      />

      <div className="results-bento">
        <SummaryCard a={a} onOpenStandard={drawer.open} onSelectTab={setTab} />
        <div className="results-metrics">
          <KpiCard
            label="Primary Standards"
            value={a.summary.primaryCount}
            tabId="recommended"
            activeTab={tab}
            onSelectTab={setTab}
            icon={<BookCheck className="size-4.5 text-white" />}
            gradient="from-blue-600 to-indigo-700"
            badgeText="Core"
            subtitle="Direct tender specification match"
            tone="navy"
          />
          <KpiCard
            label="Related Standards"
            value={a.summary.relatedCount}
            tabId="related"
            activeTab={tab}
            onSelectTab={setTab}
            icon={<Network className="size-4.5 text-white" />}
            gradient="from-violet-600 to-purple-700"
            badgeText="Normative"
            subtitle="Interlinked reference network"
            tone="violet"
          />
          <KpiCard
            label="Certification Mappings"
            value={a.summary.certificationCount}
            tabId="certification"
            activeTab={tab}
            onSelectTab={setTab}
            icon={<Award className="size-4.5 text-white" />}
            gradient="from-amber-500 to-orange-600"
            badgeText="BIS / ISI"
            subtitle="Conformity assessment schemes"
            tone="amber"
          />
          <KpiCard
            label="Potential Gaps"
            value={a.summary.gapCount}
            tabId="gaps"
            activeTab={tab}
            onSelectTab={setTab}
            icon={a.summary.gapCount === 0 ? <CheckCircle2 className="size-4.5 text-white" /> : <AlertTriangle className="size-4.5 text-white" />}
            gradient={a.summary.gapCount === 0 ? "from-emerald-500 to-teal-600" : "from-amber-500 to-rose-600"}
            badgeText={a.summary.gapCount === 0 ? "Zero Gaps" : "Review"}
            subtitle={a.summary.gapCount === 0 ? "100% parameter coverage" : "Missing clauses flagged"}
            tone={a.summary.gapCount === 0 ? "emerald" : "amber"}
          />
          <KpiCard
            label="Outdated References"
            value={outdatedFlagged}
            tabId="outdated"
            activeTab={tab}
            onSelectTab={setTab}
            icon={<History className="size-5 text-white" />}
            gradient={outdatedFlagged === 0 ? "from-teal-600 to-emerald-700" : "from-rose-500 to-red-600"}
            badgeText={outdatedFlagged === 0 ? "All Current" : "Superseded"}
            subtitle={outdatedFlagged === 0 ? "All editions verified active in BIS repository" : "Older edition years require updating"}
            tone={outdatedFlagged === 0 ? "emerald" : "rose"}
            isWide
          />
        </div>
      </div>

      <div className="surface-strip px-2">
        <Tabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: 'recommended', label: 'Top Recommended', count: a.recommendations.length },
            { id: 'related', label: 'Related Standards', count: a.related.length },
            { id: 'certification', label: 'Certification', count: a.summary.certificationCount },
            { id: 'gaps', label: 'Potential Gaps', count: a.gaps.length },
            { id: 'outdated', label: 'Outdated References', count: a.outdated.length },
            { id: 'evidence', label: 'Evidence' },
            { id: 'graph', label: 'Knowledge Graph' },
          ]}
        />
      </div>

      <ErrorBoundary label="Results panel">
        {tab === 'recommended' &&
          (a.recommendations.length ? (
            <div className="space-y-3">
              {a.recommendations.map((r, i) => (
                <RecommendationCard key={r.standard.id} rec={r} rank={i} requirements={a.requirements} onOpenStandard={drawer.open} defaultOpen={i === 0} />
              ))}
            </div>
          ) : (
            <EmptyState icon={<ShieldAlert className="size-5" />} title="No confident match in the indexed dataset" description="Try adding the product type, sector and key ratings, or browse the Standards Explorer. The demo index covers lighting, cables, electrical, civil, water, solar, IT and metering." />
          ))}

        {tab === 'related' &&
          (a.related.length ? (
            <div className="space-y-3">
              {a.related.map((r) => (
                <RecommendationCard key={r.standard.id} rec={r} requirements={a.requirements} onOpenStandard={drawer.open} />
              ))}
            </div>
          ) : (
            <EmptyState title="No related standards" description="No relationship links are indexed for the primary recommendations." />
          ))}

        {tab === 'certification' && <CertificationPanel items={a.certifications} primaryIds={primaryIds} onOpenStandard={drawer.open} />}

        {tab === 'gaps' && (
          <div className="space-y-4">
            <DisclaimerBar text="Gap findings are potential issues detected by rules against indexed metadata. They do not establish legal obligations — review each item before acting." />
            <GapList gaps={a.gaps} lookup={lookup} onOpenStandard={drawer.open} />
          </div>
        )}

        {tab === 'outdated' && <OutdatedTable items={a.outdated} onOpenStandard={drawer.open} />}

        {tab === 'evidence' && (
          <div className="space-y-3">
            {a.recommendations.map((r) => (
              <Card key={r.standard.id} className="p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold text-ink">{r.standard.number}</span>
                  <ConfidencePill c={r.confidence} />
                  <span className="text-[13px] text-ink-muted">{r.standard.title}</span>
                </div>
                <EvidenceList evidence={r.evidence} source={r.standard.source} />
              </Card>
            ))}
            {!a.recommendations.length && <EmptyState title="No evidence to show" />}
          </div>
        )}

        {tab === 'graph' && (
          <div className="space-y-3">
            <StandardsGraph graph={a.graph} height={520} onSelect={(n) => n.standardId && drawer.open(n.standardId)} />
            <GraphLegend />
          </div>
        )}
      </ErrorBoundary>

      <DisclaimerBar text={a.disclaimer} />
      <StandardDetailDrawer id={drawer.id} onClose={drawer.close} onNavigate={drawer.open} />
    </div>
  );
}

function SummaryCard({
  a,
  onOpenStandard,
  onSelectTab,
}: {
  a: AnalysisResult;
  onOpenStandard?: (id: string) => void;
  onSelectTab?: (tab: Tab) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showConfidenceGraph, setShowConfidenceGraph] = useState(false);
  const totalMs = Object.values(a.timingsMs).reduce((x, y) => x + y, 0);

  const handleCopy = () => {
    navigator.clipboard.writeText(a.input.original);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const topRec = a.recommendations[0];
  const sectorName = topRec?.standard.sector ? SECTOR_LABELS[topRec.standard.sector] || 'Engineering' : 'Standards';

  return (
    <Card className="depth-card p-6 animate-fade-up border border-line bg-gradient-to-b from-surface-raised via-surface-raised to-surface/50 space-y-5">
      {/* Top Meta Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-3.5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {a.provider.mode === 'live' ? 'Live AI Engine' : 'Demo Dataset'}
          </span>
          <span className="text-ink-subtle opacity-40">•</span>
          <span className="text-[11px] font-semibold text-ink-muted">
            {sectorName} Sector
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <Badge tone={a.provider.mode === 'live' ? 'emerald' : 'amber'} className="font-semibold shadow-xs">
            <Sparkles className="size-3" />
            {a.provider.mode === 'live' ? 'Groq / Gemini Live' : 'Demo Mode'}
          </Badge>
          <Badge tone="slate" className="shadow-xs">
            <FileText className="size-3" />
            {a.input.source.toUpperCase()}
          </Badge>
          <Badge tone="sky" className="shadow-xs">
            <Globe className="size-3" />
            {a.input.language === 'en' ? 'English' : a.input.language === 'hi' ? 'Hindi' : a.input.language === 'hinglish' ? 'Hinglish (Auto)' : 'Multi-lingual'}
          </Badge>
          <Badge tone="slate" className="font-mono shadow-xs">
            <Timer className="size-3" />
            {totalMs > 1000 ? `${(totalMs / 1000).toFixed(2)}s` : `${totalMs} ms`}
          </Badge>
          <Badge tone="slate" className="shadow-xs">
            <Calendar className="size-3" />
            {formatDate(a.createdAt)}
          </Badge>
        </div>
      </div>

      {/* Main Title & Input Details */}
      <div className="space-y-3">
        <div>
          <div className="label-caps text-ink-subtle mb-1">Identified Scope & Product</div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight capitalize">
            {a.summary.productDescription || 'Technical Specification'}
          </h2>
        </div>

        {/* User Original Input Prompt */}
        <div className="relative rounded-xl border border-line bg-surface-sunken/60 dark:bg-muted/30 p-3.5 pl-4 group transition-colors hover:border-line-strong">
          <div className="flex items-start justify-between gap-3">
            <div className="text-[13px] text-ink leading-relaxed pr-8">
              <span className="text-accent font-serif text-base mr-1">&ldquo;</span>
              {a.input.original}
              <span className="text-accent font-serif text-base ml-1">&rdquo;</span>
            </div>
            <button
              onClick={handleCopy}
              className="size-7 rounded-lg bg-surface-raised border border-line hover:bg-soft text-ink-muted hover:text-ink flex items-center justify-center transition-all shadow-2xs shrink-0 cursor-pointer"
              title="Copy input text"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
            </button>
          </div>
        </div>

        {/* AI Translation Callout (if translation was performed) */}
        {a.input.translationNote && (
          <div className="rounded-xl border border-sky-200/80 bg-gradient-to-r from-sky-50/70 via-indigo-50/40 to-surface-raised dark:from-sky-950/20 dark:via-indigo-950/10 dark:border-sky-900/50 p-3.5 space-y-1.5 text-[12.5px]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sky-950 dark:text-sky-300 text-[11.5px] uppercase tracking-wider">
                <Languages className="size-4 text-sky-600 dark:text-sky-400" />
                <span>AI Technical English Normalization</span>
              </div>
              <span className="text-[10.5px] font-medium text-sky-700 dark:text-sky-400 bg-sky-100/80 dark:bg-sky-900/50 px-2 py-0.5 rounded-full">
                Hinglish &rarr; Standard English
              </span>
            </div>
            <p className="font-medium text-ink leading-relaxed pl-6">
              &ldquo;{a.input.normalized}&rdquo;
            </p>
          </div>
        )}
      </div>

      {/* Extracted Requirements Chips */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="label-caps font-bold">Extracted requirements ({a.requirements.length})</span>
          </div>
          <span className="text-[11px] text-ink-subtle hidden sm:inline">
            Hover chip to view confidence score & source citation
          </span>
        </div>
        <RequirementChips requirements={a.requirements} limit={16} />
      </div>

      {/* AI Recommendation Confidence Spotlight */}
      {topRec && (
        <div className="rounded-2xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/70 via-surface-raised to-sky-50/40 dark:from-indigo-950/30 dark:via-surface-raised dark:to-sky-950/20 p-4 sm:p-5 shadow-xs space-y-3.5">
          {/* Header Row: Eyebrow + Pill on left, Action buttons on right */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-indigo-100/80 dark:border-indigo-900/40 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="grid size-6 place-items-center rounded-md bg-indigo-600 text-white shadow-2xs">
                <Sparkles className="size-3.5" />
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                AI Top Recommendation
              </span>
              <ConfidencePill c={topRec.confidence} />
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {onSelectTab && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectTab('recommended')}
                  className="text-[11.5px] h-7 px-2.5 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100/60 dark:hover:bg-indigo-950/60"
                >
                  All Matches ({a.recommendations.length})
                </Button>
              )}
              {onOpenStandard && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onOpenStandard(topRec.standard.id)}
                  className="text-[11.5px] h-7 px-2.5"
                >
                  Standard Details
                </Button>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowConfidenceGraph(!showConfidenceGraph)}
                className="gap-1.5 shadow-2xs cursor-pointer text-[11.5px] h-7 px-2.5 border-indigo-200/70 dark:border-indigo-800/60"
              >
                <BarChart3 className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{showConfidenceGraph ? 'Hide Graph' : 'Confidence Graph'}</span>
                <ChevronDown className={cx('size-3.5 transition-transform duration-200', showConfidenceGraph && 'rotate-180')} />
              </Button>
            </div>
          </div>

          {/* Standard Number & Title with Full Width */}
          <div className="flex items-start gap-3">
            <div className="grid size-9.5 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white shadow-sm shadow-indigo-500/25 shrink-0 mt-0.5">
              <BookCheck className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-xs font-bold text-primary dark:text-primary-fg tracking-wide">
                {topRec.standard.number}
              </div>
              <div className="font-bold text-ink text-[14.5px] sm:text-[15.5px] leading-snug mt-0.5">
                {topRec.standard.title}
              </div>
              {topRec.reasons[0] && (
                <div className="mt-1 text-[11.5px] text-ink-muted leading-relaxed line-clamp-2">
                  {topRec.reasons[0]}
                </div>
              )}
            </div>
          </div>

          {/* Interactive Confidence Intelligence Graph Display */}
          {showConfidenceGraph && (
            <div className="pt-3 border-t border-line/80 animate-fade-in">
              <ConfidenceMeter c={topRec.confidence} showBreakdown />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function KpiCard({
  label,
  value,
  tabId,
  activeTab,
  onSelectTab,
  icon,
  gradient,
  badgeText,
  subtitle,
  tone = 'navy',
  isWide = false,
}: {
  label: string;
  value: number;
  tabId: Tab;
  activeTab: Tab;
  onSelectTab: (tab: Tab) => void;
  icon: React.ReactNode;
  gradient: string;
  badgeText: string;
  subtitle: string;
  tone?: 'navy' | 'amber' | 'rose' | 'emerald' | 'violet';
  isWide?: boolean;
}) {
  const isSelected = activeTab === tabId;
  const toneColor = {
    navy: 'text-blue-700 dark:text-blue-400',
    violet: 'text-violet-700 dark:text-violet-400',
    amber: 'text-amber-700 dark:text-amber-400',
    rose: 'text-rose-700 dark:text-rose-400',
    emerald: 'text-emerald-700 dark:text-emerald-400',
  }[tone];

  // Wide banner layout for the 5th card (Outdated References)
  if (isWide) {
    return (
      <Card
        onClick={() => onSelectTab(tabId)}
        className={cx(
          'group relative p-3.5 sm:p-4 transition-all duration-200 cursor-pointer overflow-hidden animate-fade-up select-none border',
          'hover:-translate-y-0.5 hover:shadow-card-hover',
          isSelected
            ? 'ring-2 ring-primary/80 border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-sm'
            : 'hover:border-line-strong bg-surface-raised border-line',
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={cx('grid size-10 place-items-center rounded-xl bg-gradient-to-br text-white shadow-xs shrink-0', gradient)}>
              {icon}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-bold text-ink group-hover:text-primary transition-colors">
                  {label}
                </span>
                <span
                  className={cx(
                    'rounded-md px-2 py-0.5 text-[10.5px] font-bold tracking-wide transition-colors',
                    value === 0
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/70 dark:border-emerald-800/60'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/70 dark:border-rose-800/60',
                  )}
                >
                  {badgeText}
                </span>
              </div>
              <div className="text-[11.5px] text-ink-muted mt-0.5 leading-tight">
                {subtitle}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/40">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${toneColor}`}>
              {value}
            </div>
            <span className="inline-flex items-center gap-0.5 text-[11.5px] font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
              <span>Explore</span>
              <ChevronRight className="size-3.5" />
            </span>
          </div>
        </div>
      </Card>
    );
  }

  // 2x2 grid standard metric card
  return (
    <Card
      onClick={() => onSelectTab(tabId)}
      className={cx(
        'group relative p-3.5 sm:p-4 transition-all duration-200 cursor-pointer overflow-hidden animate-fade-up select-none border flex flex-col justify-between min-h-[132px]',
        'hover:-translate-y-0.5 hover:shadow-card-hover',
        isSelected
          ? 'ring-2 ring-primary/80 border-primary/50 bg-primary/5 dark:bg-primary/10 shadow-sm'
          : 'hover:border-line-strong bg-surface-raised border-line',
      )}
    >
      {/* Top: Icon + Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className={cx('grid size-9 place-items-center rounded-xl bg-gradient-to-br text-white shadow-2xs shrink-0', gradient)}>
          {icon}
        </div>
        <span className="rounded-md bg-muted/80 dark:bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-ink-muted group-hover:text-ink transition-colors shrink-0">
          {badgeText}
        </span>
      </div>

      {/* Middle: Value & Label */}
      <div className="mt-2.5">
        <div className={`text-2xl sm:text-3xl font-black tracking-tight leading-none ${toneColor}`}>
          {value}
        </div>
        <div className="text-[12px] font-bold text-ink group-hover:text-primary transition-colors mt-1 leading-snug">
          {label}
        </div>
      </div>

      {/* Bottom: Subtitle & Arrow */}
      <div className="mt-2 pt-1.5 border-t border-line/50 flex items-center justify-between text-[11px] text-ink-muted">
        <span className="truncate max-w-[85%] leading-tight">{subtitle}</span>
        <ChevronRight className="size-3.5 text-ink-subtle opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
      </div>
    </Card>
  );
}

