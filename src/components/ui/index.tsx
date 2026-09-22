import { AlertTriangle, Inbox, Loader2, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

export { cx } from './cx';
import { cx } from './cx';

// ───────────────────────────── Button ────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'accent' | 'danger' | 'subtle';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary/90 shadow-sm disabled:opacity-50',
  accent: 'bg-accent text-accent-fg hover:bg-accent/90 shadow-sm disabled:opacity-50',
  secondary: 'bg-surface-sunken text-ink border border-line hover:bg-soft disabled:opacity-50',
  subtle: 'bg-soft text-soft-fg hover:bg-soft-hover disabled:opacity-50',
  ghost: 'text-ink-muted hover:bg-soft hover:text-ink disabled:opacity-50',
  danger: 'bg-signal-risk text-white hover:bg-signal-risk/90 disabled:opacity-50 shadow-sm',
};
const SIZES: Record<Size, string> = {
  xs: 'h-7 px-2 text-[12px] gap-1',
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-[13.5px] gap-2',
  lg: 'h-11 px-5 text-[14.5px] gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:cursor-not-allowed whitespace-nowrap',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

// ───────────────────────────── Badge ─────────────────────────────────────────

export type Tone = 'navy' | 'saffron' | 'emerald' | 'amber' | 'rose' | 'slate' | 'sky' | 'violet';

const TONES: Record<Tone, string> = {
  navy: 'bg-tone-navy-bg text-tone-navy-fg ring-tone-navy-ring',
  saffron: 'bg-tone-saffron-bg text-tone-saffron-fg ring-tone-saffron-ring',
  emerald: 'bg-tone-emerald-bg text-tone-emerald-fg ring-tone-emerald-ring',
  amber: 'bg-tone-amber-bg text-tone-amber-fg ring-tone-amber-ring',
  rose: 'bg-tone-rose-bg text-tone-rose-fg ring-tone-rose-ring',
  slate: 'bg-tone-slate-bg text-tone-slate-fg ring-tone-slate-ring',
  sky: 'bg-tone-sky-bg text-tone-sky-fg ring-tone-sky-ring',
  violet: 'bg-tone-violet-bg text-tone-violet-fg ring-tone-violet-ring',
};

export function Badge({ tone = 'slate', className, children, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cx(
        'inline-flex h-5 items-center justify-center gap-1 rounded-md px-2 text-[11px] font-semibold ring-1 ring-inset whitespace-nowrap transition-colors',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

// ───────────────────────────── Card ──────────────────────────────────────────

export function Card({ className, children, hover, ...rest }: HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div className={cx('card content-card', hover && 'card-hover', className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action, icon }: { title: string; subtitle?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 grid size-9 place-items-center rounded-lg bg-soft text-soft-fg">{icon}</div>}
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="text-[13px] text-ink-muted mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ───────────────────────────── Form controls ─────────────────────────────────

/** Text input with consistent theming. Always pass an aria-label or id+label. */
export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cx('field h-9 px-3 text-[13.5px]', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx('field px-3.5 py-2.5 text-[14px] leading-relaxed resize-y', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx('field h-9 px-2.5 text-[13px] bg-surface-raised', className)} {...rest}>
      {children}
    </select>
  );
}

/** Labelled select used across filter bars. */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'All',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <label className="text-[12px]">
      <span className="label-caps block mb-1">{label}</span>
      <Select value={value} onChange={(e) => onChange(e.target.value)} aria-label={label}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </label>
  );
}

// ───────────────────────────── States ────────────────────────────────────────

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('skeleton', className)} aria-hidden />;
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card p-5 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cx('h-3', i % 2 ? 'w-5/6' : 'w-full')} />
      ))}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="card empty-state p-10 text-center animate-fade-in">
      <div className="mx-auto mb-3 grid size-12 place-items-center rounded-full bg-soft text-soft-fg">{icon ?? <Inbox className="size-5" />}</div>
      <h3 className="text-[15px] font-semibold">{title}</h3>
      {description && <p className="mt-1 text-[13px] text-ink-muted max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="card p-6 border-tone-rose-ring bg-tone-rose-bg animate-fade-in" role="alert">
      <div className="flex gap-3">
        <AlertTriangle className="size-5 text-tone-rose-fg shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-tone-rose-fg">{title}</h3>
          <p className="text-[13px] text-tone-rose-fg/90 mt-0.5">{message}</p>
          {onRetry && (
            <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
              <RefreshCw className="size-3.5" /> Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-ink-muted text-[13px]">
      <Loader2 className="size-4 animate-spin" /> {label}
    </div>
  );
}

// ───────────────────────────── Overlay helpers ───────────────────────────────

/**
 * Shared modal behaviour: Escape to close, body scroll lock and a focus trap so
 * keyboard users cannot tab out of an open overlay.
 */
function useOverlayBehaviour(open: boolean, onClose: () => void, container: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !container.current) return;
      const focusable = container.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    // Move focus into the overlay for screen-reader and keyboard users.
    const timer = window.setTimeout(() => {
      const target = container.current?.querySelector<HTMLElement>('[data-autofocus], button, [href], input, textarea, select');
      target?.focus();
    }, 0);

    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(timer);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [open, onClose, container]);
}

// ───────────────────────────── Drawer ────────────────────────────────────────

export function Drawer({
  open,
  onClose,
  title,
  children,
  width = 'max-w-xl',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useOverlayBehaviour(open, onClose, panel);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button aria-label="Close panel" className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} tabIndex={-1} />
      <div ref={panel} className={cx('relative h-full w-full bg-surface-overlay shadow-pop flex flex-col animate-[fade-up_0.22s_ease-out]', width)}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1">{title}</div>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-md text-ink-muted hover:bg-soft hover:text-ink" aria-label="Close panel">
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

// ───────────────────────────── Dialog ────────────────────────────────────────

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-lg',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  useOverlayBehaviour(open, onClose, panel);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true">
      <button aria-label="Close dialog" className="fixed inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in" onClick={onClose} tabIndex={-1} />
      <div ref={panel} className={cx('relative my-auto w-full rounded-card border border-line bg-surface-overlay shadow-pop animate-[fade-up_0.22s_ease-out]', width)}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-ink-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="grid size-8 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-soft hover:text-ink" aria-label="Close dialog">
            <X className="size-4" />
          </button>
        </div>
        {children && <div className="px-5 py-4">{children}</div>}
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// ───────────────────────────── Tabs ──────────────────────────────────────────

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
}) {
  // Roving arrow-key navigation, per the WAI-ARIA tabs pattern.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    if (e.key === 'ArrowRight') onChange(tabs[(i + 1) % tabs.length].id);
    else if (e.key === 'ArrowLeft') onChange(tabs[(i - 1 + tabs.length) % tabs.length].id);
    else if (e.key === 'Home') onChange(tabs[0].id);
    else if (e.key === 'End') onChange(tabs[tabs.length - 1].id);
    else return;
    e.preventDefault();
  };

  return (
    <div className="flex gap-1 border-b border-line overflow-x-auto" role="tablist" onKeyDown={onKeyDown}>
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          className={cx(
            'relative px-3.5 py-2.5 text-[13px] font-medium whitespace-nowrap transition-colors',
            value === t.id ? 'text-ink' : 'text-ink-muted hover:text-ink',
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={cx(
                'ml-1.5 rounded-full px-1.5 py-px text-[10px] font-semibold',
                value === t.id ? 'bg-primary text-primary-fg' : 'bg-muted text-muted-fg',
              )}
            >
              {t.count}
            </span>
          )}
          {value === t.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
        </button>
      ))}
    </div>
  );
}

// ───────────────────────────── Disclaimer ────────────────────────────────────

export function DisclaimerBar({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-tone-amber-ring bg-tone-amber-bg px-3 py-2 text-[12px] text-tone-amber-fg flex gap-2">
      <AlertTriangle className="size-3.5 mt-0.5 shrink-0" />
      <span>{text}</span>
    </p>
  );
}

// ───────────────────────────── Progress ──────────────────────────────────────

export function ProgressBar({ value, tone = 'primary', className }: { value: number; tone?: 'primary' | 'ok' | 'warn' | 'risk'; className?: string }) {
  const bg = { primary: 'bg-primary', ok: 'bg-signal-ok', warn: 'bg-signal-warn', risk: 'bg-signal-risk' }[tone];
  return (
    <div className={cx('h-2 w-full overflow-hidden rounded-full bg-muted', className)}>
      <div className={cx('h-full rounded-full transition-[width] duration-500', bg)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
