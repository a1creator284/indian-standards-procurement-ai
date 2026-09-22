import { useState } from 'react';
import type { Requirement, RequirementCategory } from '@/engine/types';
import { Badge, cx } from '@/components/ui';
import { REQ_CATEGORY_TONE } from './labels';
import {
  Award,
  Box,
  Cpu,
  FlaskConical,
  Gauge,
  Hash,
  HelpCircle,
  Leaf,
  Package,
  Ruler,
  ShieldAlert,
  ShieldCheck,
  Tag,
  Wrench,
  Zap,
} from 'lucide-react';

const CATEGORY_ICONS: Record<RequirementCategory, typeof Zap> = {
  product: Package,
  electrical: Zap,
  performance: Gauge,
  environmental: Leaf,
  safety: ShieldAlert,
  mechanical: Cpu,
  material: Box,
  installation: Wrench,
  testing: FlaskConical,
  certification: Award,
  dimensional: Ruler,
  quantity: Hash,
  warranty: ShieldCheck,
  reference: Tag,
  other: HelpCircle,
};

export function RequirementChips({ requirements, limit }: { requirements: Requirement[]; limit?: number }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const list = limit ? requirements.slice(0, limit) : requirements;

  if (!list.length) {
    return <p className="text-[13px] text-ink-muted">No structured requirements were extracted.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {list.map((r) => {
        const Icon = CATEGORY_ICONS[r.category] || Tag;
        const tone = REQ_CATEGORY_TONE[r.category];
        const isHovered = hoveredId === r.id;
        const cleanText = r.text.replace(/^[A-Z][a-z]+: /, '');
        const confPct = Math.round(r.confidence * 100);

        return (
          <div
            key={r.id}
            className="relative"
            onMouseEnter={() => setHoveredId(r.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              className={cx(
                'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-medium transition-all duration-200 cursor-pointer shadow-xs select-none',
                'border hover:-translate-y-0.5 hover:shadow-sm',
                tone === 'violet' && 'bg-violet-50/80 dark:bg-violet-950/30 text-violet-900 dark:text-violet-300 border-violet-200 dark:border-violet-800/60 hover:border-violet-400',
                tone === 'saffron' && 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:border-amber-400',
                tone === 'navy' && 'bg-blue-50/80 dark:bg-blue-950/30 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800/60 hover:border-blue-400',
                tone === 'sky' && 'bg-sky-50/80 dark:bg-sky-950/30 text-sky-900 dark:text-sky-300 border-sky-200 dark:border-sky-800/60 hover:border-sky-400',
                tone === 'emerald' && 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400',
                tone === 'rose' && 'bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 border-rose-200 dark:border-rose-800/60 hover:border-rose-400',
                tone === 'amber' && 'bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800/60 hover:border-amber-400',
                tone === 'slate' && 'bg-slate-100/80 dark:bg-slate-800/50 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/60 hover:border-slate-400',
              )}
            >
              <Icon className="size-3.5 shrink-0 opacity-70" />
              <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">
                {r.category}
              </span>
              <span className="text-ink-subtle opacity-40">·</span>
              <span className="font-semibold text-ink dark:text-ink-inverse max-w-[200px] truncate">
                {cleanText}
              </span>
              <span className="ml-0.5 rounded px-1 py-0.2 bg-black/5 dark:bg-white/10 text-[10px] font-mono font-semibold opacity-75">
                {confPct}%
              </span>
            </div>

            {/* Custom High-Fidelity Floating Tooltip */}
            {isHovered && (
              <div className="absolute left-1/2 -top-2 -translate-x-1/2 -translate-y-full z-50 pointer-events-none w-64 p-3 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white backdrop-blur-md shadow-xl border border-white/10 animate-fade-in text-[11.5px] space-y-1.5">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-1.5 capitalize font-semibold text-slate-200">
                    <Icon className="size-3.5 text-accent" />
                    <span>{r.category} Specification</span>
                  </div>
                  <span className="font-mono text-[10.5px] text-emerald-400 font-bold">
                    {confPct}% confidence
                  </span>
                </div>
                <div>
                  <div className="text-slate-300 text-[11px] leading-relaxed">
                    <span className="text-slate-400 font-medium">Value: </span>
                    <span className="font-semibold text-white">{cleanText}</span>
                  </div>
                  {r.sourceSpan && (
                    <div className="mt-1 text-[10.5px] text-slate-400 bg-white/5 rounded px-2 py-1 font-mono">
                      Matched from: &ldquo;{r.sourceSpan}&rdquo;
                    </div>
                  )}
                </div>
                {/* Tooltip Downward Arrow */}
                <div className="absolute left-1/2 -bottom-1 -translate-x-1/2 size-2 rotate-45 bg-slate-900 dark:bg-slate-800 border-r border-b border-white/10" />
              </div>
            )}
          </div>
        );
      })}
      {limit && requirements.length > limit && (
        <Badge tone="slate" className="h-7 px-2.5 font-semibold text-[11.5px] rounded-lg">
          +{requirements.length - limit} more requirements
        </Badge>
      )}
    </div>
  );
}

