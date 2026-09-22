import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  ArrowRight,
  Check,
  ClipboardPaste,
  Cpu,
  Globe,
  Languages,
  Layers,
  Sparkles,
  Sun,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { Button, cx } from '@/components/ui';
import { detectLanguage } from '@/engine/language/detect';
import { EXAMPLE_QUERIES } from './exampleQueries';

const QUERY_ICONS: Record<string, typeof Zap> = {
  'LED Street Lighting': Zap,
  'LT Power Cables': Layers,
  'Rooftop Solar PV': Sun,
  'Submersible Pump (Hinglish)': Wrench,
  'सड़क प्रकाश (Hindi)': Languages,
  'Distribution Transformer': Cpu,
};

export function SearchHero({ compact = false, initial = '' }: { compact?: boolean; initial?: string }) {
  const [text, setText] = useState(initial);
  const [copiedNotification, setCopiedNotification] = useState(false);
  const { runAnalysis, analysing, analysisError, clearError } = useApp();
  const navigate = useNavigate();
  const lang = text.trim().length > 6 ? detectLanguage(text) : 'unknown';

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || analysing) return;
    try {
      const result = await runAnalysis(text.trim(), text.length > 600 ? 'paste' : 'text');
      navigate(`/results/${result.id}`);
    } catch {
      /* error shown inline */
    }
  };

  const handlePaste = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        setText(clipText);
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 2000);
      }
    } catch {
      /* clipboard read blocked */
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <form
      onSubmit={submit}
      className={cx(
        'analysis-input-stage card p-5 md:p-6 animate-fade-up border border-line transition-all duration-200 shadow-card',
        'bg-gradient-to-b from-surface-raised via-surface-raised to-surface/50',
        !compact && 'shadow-card-hover',
      )}
    >
      <label htmlFor="hero-input" className="sr-only">
        Describe the product or paste a tender specification
      </label>

      {!compact && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-primary via-primary-hover to-indigo-700 text-white shadow-sm shadow-primary/25 shrink-0">
              <Sparkles className="size-5.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15.5px] font-extrabold text-ink tracking-tight">Requirement Intelligence Studio</h3>
                <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Multi-lingual AI
                </span>
              </div>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                Describe technical parameters, product ratings, or paste tender clauses for automated BIS mapping.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px] font-medium text-ink-muted">
            <span className="rounded-md bg-muted px-2 py-1 font-mono text-[10.5px]">876 Standards Indexed</span>
            <span className="rounded-md bg-muted px-2 py-1 font-mono text-[10.5px]">Hybrid RAG Active</span>
          </div>
        </div>
      )}

      {/* Modern High-Impact Input Area */}
      <div className="relative rounded-2xl border-2 border-line/90 bg-surface-sunken/60 dark:bg-muted/20 transition-all duration-200 focus-within:border-primary focus-within:bg-surface-raised focus-within:ring-4 focus-within:ring-primary/10 shadow-inner">
        <textarea
          id="hero-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (analysisError) clearError();
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') void submit();
          }}
          rows={compact ? 3 : 4}
          placeholder="Describe your requirement in English, Hindi, or Hinglish…&#10;e.g. Gaon ke borewell ke liye 5 HP submersible pump chahiye, 3 phase, 415V, head 60 m, ISI mark ke saath"
          className="w-full resize-y rounded-2xl bg-transparent px-4.5 pt-4 pb-10 text-[14.5px] leading-relaxed outline-none transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500 text-ink font-medium"
        />

        {/* Top-Right Floating Actions: Paste, Language Badge, Clear */}
        <div className="absolute right-3.5 top-3.5 flex items-center gap-1.5">
          {text.trim().length === 0 ? (
            <button
              type="button"
              onClick={handlePaste}
              className="inline-flex items-center gap-1 rounded-lg bg-surface-raised px-2.5 py-1 text-[11.5px] font-medium text-ink-muted hover:text-ink border border-line shadow-2xs hover:bg-soft transition-all cursor-pointer"
              title="Paste from clipboard"
            >
              <ClipboardPaste className="size-3.5 text-accent" />
              <span>Paste</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setText('')}
              className="grid size-6 place-items-center rounded-full bg-surface-raised text-ink-muted hover:text-ink border border-line shadow-2xs hover:bg-soft cursor-pointer transition-colors"
              title="Clear input"
            >
              <X className="size-3.5" />
            </button>
          )}

          {copiedNotification && (
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold animate-fade-in">
              <Check className="size-3" /> Pasted!
            </span>
          )}

          {lang !== 'unknown' && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-raised px-2.5 py-1 text-[11.5px] font-bold text-primary dark:text-primary-fg border border-line shadow-xs">
              <Globe className="size-3.5 text-accent" />
              <span>{lang === 'en' ? 'English' : lang === 'hi' ? 'Hindi (हिन्दी)' : 'Hinglish AI'}</span>
            </span>
          )}
        </div>

        {/* Bottom Status Bar inside textarea */}
        <div className="absolute left-4 right-4 bottom-2.5 flex items-center justify-between text-[11px] font-mono text-ink-subtle pointer-events-none">
          <div className="flex items-center gap-2">
            <span>{wordCount} words</span>
            <span>•</span>
            <span>{text.length} characters</span>
          </div>
          {text.trim().length > 0 && (
            <span className="text-[10.5px] font-sans font-semibold text-emerald-600 dark:text-emerald-400">
              Ready to analyze
            </span>
          )}
        </div>
      </div>

      {analysisError && (
        <p className="mt-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[12.5px] font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 animate-fade-in" role="alert">
          {analysisError}
        </p>
      )}

      {/* Main Action Bar */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button
          type="submit"
          variant="accent"
          size={compact ? 'md' : 'lg'}
          loading={analysing}
          disabled={!text.trim() || analysing}
          className={cx(
            'gap-2 px-6 h-11 text-[14px] font-bold rounded-xl transition-all duration-200 cursor-pointer',
            text.trim()
              ? 'bg-gradient-to-r from-accent via-orange-500 to-amber-500 hover:from-accent-hover hover:to-orange-600 text-white shadow-lg shadow-accent/25 hover:-translate-y-0.5'
              : 'bg-primary text-white hover:bg-primary/90 opacity-90',
          )}
        >
          <Sparkles className="size-4.5" />
          <span>{analysing ? 'Running AI Pipeline…' : 'Analyze Standards'}</span>
          {!analysing && <ArrowRight className="size-4.5" />}
        </Button>

        {!compact && (
          <span className="text-[12px] text-ink-muted flex items-center gap-1.5 font-medium">
            <span>Shortcut:</span>
            <kbd className="rounded-md bg-muted px-2 py-0.5 font-mono text-[11px] font-semibold text-ink border border-line/80 shadow-2xs">
              Ctrl + Enter
            </kbd>
          </span>
        )}
      </div>

      {/* Interactive Scenario Cards Grid */}
      {!compact && (
        <div className="mt-6 border-t border-line/60 pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="label-caps font-bold text-ink">Benchmark Procurement Scenarios</span>
              <span className="text-[11px] text-ink-muted hidden sm:inline">Click to load pre-verified tender text</span>
            </div>
            <span className="text-[11px] font-semibold text-primary">Tested for SIH Evaluation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {EXAMPLE_QUERIES.map((q) => {
              const Icon = QUERY_ICONS[q.label] || ArrowRight;
              const isSelected = text === q.text;

              return (
                <button
                  key={q.label}
                  type="button"
                  onClick={() => setText(q.text)}
                  className={cx(
                    'group p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer select-none flex flex-col justify-between',
                    isSelected
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                      : 'border-line bg-surface-raised hover:border-primary-ring hover:shadow-sm hover:-translate-y-0.5',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-soft text-soft-fg group-hover:bg-primary group-hover:text-white transition-colors shrink-0">
                        <Icon className="size-3.5" />
                      </span>
                      <span className="font-bold text-[13px] text-ink group-hover:text-primary transition-colors leading-tight">
                        {q.label}
                      </span>
                    </div>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted shrink-0">
                      {q.badge}
                    </span>
                  </div>

                  <p className="mt-2 text-[11.5px] text-ink-muted line-clamp-2 leading-relaxed">
                    {q.snippet}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity pt-1.5 border-t border-line/40">
                    <span>Load specification</span>
                    <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </form>
  );
}


