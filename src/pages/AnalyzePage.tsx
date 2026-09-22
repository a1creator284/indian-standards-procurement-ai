import { lazy, Suspense, useState } from 'react';
import { ArrowRight, FileSearch, FileText, ShieldCheck, Sparkles, Type } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { SearchHero } from '@/components/analysis/SearchHero';
import { CardSkeleton, cx } from '@/components/ui';

// PDF.js is sizeable. Keep the document workspace out of the text-analysis
// route until the user explicitly chooses the upload tab.
const UploadPage = lazy(() => import('./UploadPage').then((m) => ({ default: m.UploadPage })));

export function AnalyzePage() {
  const [activeTab, setActiveTab] = useState<'text' | 'document'>('text');

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
      <PageHeader
        eyebrow="Analysis"
        title="Turn a procurement brief into standards-ready evidence"
        description="Describe a product requirement or upload a tender document to identify applicable Indian Standards, related references, certification signals, and procurement gaps."
      />

      <section className="depth-card overflow-hidden rounded-2xl border border-line bg-surface-raised shadow-xs">
        <div className="flex items-center justify-between border-b border-line/70 bg-surface-sunken/60 px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-ink-muted">
          <div className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-accent" /> Procurement Intelligence Pipeline
          </div>
          <span className="text-[10.5px] font-mono text-ink-subtle hidden sm:inline">Step 1 of 3</span>
        </div>
        <div className="grid divide-y divide-line/70 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <WorkflowStep number="01" icon={Type} title="Describe Requirement" detail="Input product, technical ratings, or paste tender clauses" active />
          <WorkflowStep number="02" icon={FileSearch} title="AI Standards Match" detail="Extract specifications, verify freshness and interlinked graph" />
          <WorkflowStep number="03" icon={ShieldCheck} title="Compliance & Spec" detail="Audit gaps, flag outdated codes, and export tender spec" terminal />
        </div>
      </section>

      {/* Modern Segmented Tab Switcher */}
      <div className="inline-flex rounded-2xl bg-muted/80 p-1.5 border border-line/70 shadow-xs">
        <TabButton 
          active={activeTab === 'text'} 
          onClick={() => setActiveTab('text')} 
          icon={Type} 
          label="Text Specification Input" 
          badge="Instant AI"
        />
        <TabButton 
          active={activeTab === 'document'} 
          onClick={() => setActiveTab('document')} 
          icon={FileText} 
          label="Upload Tender PDF / Document" 
          badge="OCR Ready"
        />
      </div>

      <div className={cx("transition-opacity duration-300", activeTab === 'text' ? 'block' : 'hidden')}>
        <SearchHero />
      </div>

      <div className={cx("transition-opacity duration-300", activeTab === 'document' ? 'block' : 'hidden')}>
        {activeTab === 'document' && (
          <Suspense fallback={<CardSkeleton lines={3} />}>
            <UploadPage inline />
          </Suspense>
        )}
      </div>
    </div>
  );
}

function WorkflowStep({
  number,
  icon: Icon,
  title,
  detail,
  active = false,
  terminal = false,
}: {
  number: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  active?: boolean;
  terminal?: boolean;
}) {
  return (
    <div
      className={cx(
        'relative flex gap-3.5 p-4.5 sm:min-h-28 transition-all duration-200',
        active
          ? 'bg-gradient-to-br from-primary/8 via-primary/4 to-transparent dark:from-primary/20 dark:via-primary/10'
          : 'hover:bg-surface-sunken/40',
      )}
    >
      <span
        className={cx(
          'grid size-10 shrink-0 place-items-center rounded-xl shadow-2xs transition-transform',
          active
            ? 'bg-primary text-white shadow-primary/20 shadow-sm scale-105'
            : 'bg-soft text-soft-fg',
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span
            className={cx(
              'rounded px-1.5 py-0.2 text-[10px] font-mono font-bold',
              active ? 'bg-primary text-white' : 'bg-muted text-ink-muted',
            )}
          >
            {number}
          </span>
          <h2 className="text-[13.5px] font-bold text-ink truncate">{title}</h2>
          {active && (
            <span className="ml-auto rounded-full bg-primary/10 text-primary dark:text-primary-fg border border-primary/20 px-2 py-0.2 text-[9.5px] font-bold uppercase tracking-wider hidden sm:inline">
              Current
            </span>
          )}
        </div>
        <p className="max-w-52 text-[12px] leading-relaxed text-ink-muted">{detail}</p>
      </div>
      {!terminal && (
        <ArrowRight className="absolute right-3 top-1/2 hidden size-4 -translate-y-1/2 text-ink-subtle/40 lg:block" />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cx(
        "flex items-center gap-2.5 px-4.5 py-2.5 text-[13px] font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none",
        active 
          ? "bg-surface-raised text-ink shadow-sm border border-line/60" 
          : "text-ink-muted hover:text-ink hover:bg-surface-raised/40"
      )}
    >
      <Icon className={cx("size-4", active ? "text-accent" : "text-ink-muted")} />
      <span>{label}</span>
      {badge && (
        <span
          className={cx(
            "rounded-md px-1.5 py-0.2 text-[10px] font-mono font-bold",
            active ? "bg-accent/10 text-accent" : "bg-muted text-ink-subtle",
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}


