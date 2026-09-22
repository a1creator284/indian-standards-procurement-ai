import { NavLink, Outlet, useLocation } from 'react-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BookOpenText,
  ChevronLeft,
  Clock3,
  FileSearch,
  FileText,
  GitFork,
  Info,
  LayoutDashboard,
  ListChecks,
  Menu,
  Monitor,
  Moon,
  PanelLeft,
  Search,
  ShieldAlert,
  Sparkles,
  Sun,
  X,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTheme, type ThemePreference } from '@/context/ThemeContext';
import { Badge, Button, cx } from '@/components/ui';
import { CopilotPanel } from '@/components/analysis/CopilotPanel';
import { CommandMenu } from '@/components/CommandMenu';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageToggle } from '@/components/ui/LanguageToggle';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const WORKFLOW: NavItem[] = [
  { to: '/', label: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/analyze', label: 'nav.analyze', icon: FileSearch },
  { to: '/explorer', label: 'nav.explorer', icon: BookOpenText },
  { to: '/history', label: 'nav.history', icon: Clock3 },
  { to: '/reports', label: 'nav.reports', icon: FileText },
];

const KNOWLEDGE: NavItem[] = [
  { to: '/results', label: 'nav.recommendations', icon: ListChecks },
  { to: '/gaps', label: 'nav.gaps', icon: ShieldAlert },
  { to: '/spec', label: 'nav.spec', icon: FileText },
  { to: '/graph', label: 'nav.graph', icon: GitFork },
];

const SECONDARY: NavItem[] = [
  { to: '/about', label: 'nav.about', icon: Info },
  { to: '/settings', label: 'nav.settings', icon: Settings },
];

/** Page titles for the header breadcrumb, keyed by route prefix. */
const TITLES: Array<[string, string]> = [
  ['/analyze', 'Analyze Specification'],
  ['/upload', 'Upload Tender'],
  ['/results', 'Recommendations'],
  ['/explorer', 'Standards Explorer'],
  ['/graph', 'Relationship Graph'],
  ['/gaps', 'Gap Analysis'],
  ['/spec', 'Tender Specification'],
  ['/history', 'Search History'],
  ['/reports', 'Reports'],
  ['/about', 'About'],
  ['/settings', 'Settings'],
];

const COLLAPSE_KEY = 'iscopilot.sidebar.collapsed';

export function AppShell() {
  const { status, statusError, analysis } = useApp();
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [copilot, setCopilot] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const pageTitle = useMemo(() => TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? 'Dashboard', [pathname]);

  // Close the mobile drawer whenever the route changes.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMobileOpen(false), [pathname]);

  // Match the desktop overlays: the mobile drawer is dismissible by keyboard
  // and exposes its modal state to assistive technology.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // Ctrl/⌘ + K opens the command menu from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const sidebar = (mini: boolean) => (
    <nav className="flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-fg" aria-label="Main navigation">
      <div className={cx('flex items-center gap-2.5 border-b border-sidebar-border px-4 py-4', mini && 'justify-center px-0')}>
        <img 
          src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" 
          alt="Government of India Emblem" 
          className={cx("shrink-0 mix-blend-multiply opacity-90 dark:opacity-80 dark:invert", mini ? "h-8 w-auto" : "h-11 w-auto")} 
        />
        {!mini && (
          <div className="min-w-0">
            <div className="truncate text-[15.5px] font-extrabold leading-tight tracking-[-0.02em] text-sidebar-fg">IS Copilot</div>
            <div className="mt-0.5 text-[9.5px] font-medium leading-tight tracking-[0.01em] text-sidebar-muted whitespace-normal">Indian Standards. Smarter Procurement.</div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-3">
        <NavGroup label={t('nav.workflow')} items={WORKFLOW} mini={mini} analysisReady={Boolean(analysis)} t={t} />
        <NavGroup label={t('nav.knowledge')} items={KNOWLEDGE} mini={mini} className="mt-4" t={t} />
      </div>

      <div className="mt-auto border-t border-sidebar-border px-2 py-3">
        <NavGroup items={SECONDARY} mini={mini} t={t} />
        {!mini && (
          <div className="mt-4 mx-2 mb-2 relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 p-3.5 shadow-sm border border-slate-200/60 dark:from-sidebar-accent dark:to-sidebar dark:border-sidebar-border">
            {/* Map Background */}
            <div className="absolute right-0 -bottom-1 pointer-events-none opacity-20 dark:opacity-25">
              <img src="/india-map.png" alt="India Map" className="w-24 h-24 object-contain object-right-bottom mix-blend-multiply dark:mix-blend-lighten" />
            </div>
            
            <div className="relative z-10">
              <div className="text-[11px] font-semibold leading-tight text-slate-800 dark:text-slate-200">
                Standardizing <br /> for a Stronger India
              </div>
              <div className="mt-2 text-[10px] font-bold italic tracking-wide">
                <span className="text-orange-500">in</span><span className="text-blue-600 dark:text-blue-400">d</span><span className="text-green-600">ia</span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <div className="flex h-3 w-4.5 flex-col overflow-hidden rounded-[2px] border border-black/15 shadow-sm">
                  <div className="h-1 w-full bg-[#FF9933]" />
                  <div className="flex h-1 w-full items-center justify-center bg-white">
                    <div className="size-[3px] rounded-full bg-[#000080]" />
                  </div>
                  <div className="h-1 w-full bg-[#138808]" />
                </div>
              </div>
            </div>
          </div>
        )}
        {!mini && (
          <div className="px-3 pt-1 text-[10.5px] font-medium text-sidebar-muted/80">
            © 2026 IS Copilot
          </div>
        )}
      </div>
    </nav>
  );

  return (
    <div className={cx('min-h-screen lg:grid', collapsed ? 'lg:grid-cols-[68px_1fr]' : 'lg:grid-cols-[248px_1fr]')}>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen lg:block">{sidebar(collapsed)}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Mobile navigation">
          <button aria-label="Close navigation" className="absolute inset-0 bg-black/50 animate-fade-in" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-[264px] shadow-pop animate-[fade-in_0.2s_ease-out]">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-3.5 z-10 grid size-8 place-items-center rounded-md text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg"
              aria-label="Close navigation"
            >
              <X className="size-4" />
            </button>
            {sidebar(false)}
          </aside>
        </div>
      )}

      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-line bg-surface-raised/95 px-3 backdrop-blur-xl md:px-7 print:hidden">
          <button
            className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-soft hover:text-ink lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <button
            className="hidden size-9 place-items-center rounded-lg text-ink-muted hover:bg-soft hover:text-ink lg:grid"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft className="size-4.5" /> : <ChevronLeft className="size-4.5" />}
          </button>

          {/* Breadcrumb. Deliberately not a heading (each page owns its <h1>) and
              not a <nav> landmark, so the sidebar stays the single navigation region. */}
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden text-[13px] text-ink-subtle sm:inline">IS Copilot</span>
            <span className="hidden text-ink-subtle sm:inline" aria-hidden>
              /
            </span>
            <span className="truncate text-[13.5px] font-bold tracking-[-0.015em] text-ink" aria-current="page">
              {pageTitle}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              onClick={() => setCommandOpen(true)}
              className="hidden h-9 items-center gap-2 rounded-lg border border-line bg-surface-sunken px-2.5 text-[12.5px] text-ink-muted transition-colors hover:border-line-strong hover:text-ink md:flex"
              aria-label="Open command menu"
            >
              <Search className="size-3.5" />
              <span>{t('action.search')}</span>
              <kbd className="rounded border border-line bg-surface-raised px-1 font-mono text-[10px]">Ctrl+K</kbd>
            </button>
            <button
              onClick={() => setCommandOpen(true)}
              className="grid size-9 place-items-center rounded-lg text-ink-muted hover:bg-soft hover:text-ink md:hidden"
              aria-label="Open command menu"
            >
              <Search className="size-4.5" />
            </button>

            <StatusPill status={status} error={statusError} />
            <ThemeToggle />
            <LanguageToggle />

            <Button size="sm" onClick={() => setCopilot(true)} className="ml-0.5">
              <Sparkles className="size-4" /> <span className="hidden sm:inline">{t('action.askCopilot')}</span>
            </Button>
          </div>
        </header>

        <main className="app-canvas mx-auto w-full max-w-[1440px] flex-1 px-4 py-7 md:px-10 md:py-10">
          <Outlet />
        </main>
      </div>

      <CopilotPanel open={copilot} onClose={() => setCopilot(false)} />
      <CommandMenu open={commandOpen} onClose={() => setCommandOpen(false)} />
    </div>
  );
}

function NavGroup({
  label,
  items,
  mini,
  className,
  analysisReady,
  t,
}: {
  label?: string;
  items: NavItem[];
  mini: boolean;
  className?: string;
  analysisReady?: boolean;
  t: (key: string) => string;
}) {
  return (
    <div className={className}>
      {label && !mini && <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.13em] text-sidebar-muted">{label}</div>}
      {label && mini && <div className="mx-auto mb-2 h-px w-6 bg-sidebar-border" />}
      <ul className="space-y-0.5">
        {items.map((n) => (
          <li key={n.to}>
            <NavLink
              to={n.to}
              end={n.end}
              title={mini ? t(n.label) : undefined}
              className={({ isActive }) =>
                cx(
                  'group relative flex items-center gap-2.5 rounded-xl text-[13px] font-semibold tracking-[-0.005em] transition-colors',
                  mini ? 'justify-center px-0 py-2.5' : 'px-3 py-2.5',
                  isActive ? 'bg-sidebar-accent text-sidebar-accent-fg' : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-fg',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" aria-hidden />}
                  <n.icon className="size-4 shrink-0" />
                  {!mini && <span className="truncate">{t(n.label)}</span>}
                  {!mini && n.to === '/results' && analysisReady && <span className="ml-auto size-1.5 rounded-full bg-primary" aria-hidden title="Analysis loaded" />}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ThemeToggle() {
  const { preference, theme, setPreference } = useTheme();
  const [open, setOpen] = useState(false);

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-theme-menu]')) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options: Array<{ value: ThemePreference; label: string; icon: LucideIcon }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ];

  return (
    <div className="relative" data-theme-menu>
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-soft hover:text-ink"
        aria-label="Change theme"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {theme === 'dark' ? <Moon className="size-4.5" /> : <Sun className="size-4.5" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-36 overflow-hidden rounded-lg border border-line bg-surface-overlay p-1 shadow-pop animate-fade-in" role="menu">
          {options.map((o) => (
            <button
              key={o.value}
              role="menuitemradio"
              aria-checked={preference === o.value}
              onClick={() => {
                setPreference(o.value);
                setOpen(false);
              }}
              className={cx(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                preference === o.value ? 'bg-soft font-medium text-soft-fg' : 'text-ink-muted hover:bg-soft/60 hover:text-ink',
              )}
            >
              <o.icon className="size-4" /> {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusPill({ status, error }: { status: ReturnType<typeof useApp>['status']; error: string | null }) {
  if (error) {
    return (
      <Badge tone="rose" className="hidden sm:inline-flex" title={error}>
        API offline
      </Badge>
    );
  }
  if (!status) {
    return (
      <Badge tone="slate" className="hidden sm:inline-flex">
        Connecting…
      </Badge>
    );
  }
  return (
    <Badge
      tone={status.mode === 'live' ? 'emerald' : 'amber'}
      className="hidden sm:inline-flex"
      title={`LLM: ${status.llm} · Embeddings: ${status.embeddings} · Repository: ${status.repository} · ${status.dataset.standardCount} standards indexed`}
    >
      <Activity className="size-3" /> {status.mode === 'live' ? 'Live AI' : 'Demo mode'}
    </Badge>
  );
}
