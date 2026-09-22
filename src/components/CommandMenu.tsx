import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  BookOpenText,
  Clock3,
  FileSearch,
  FileText,
  GitFork,
  LayoutDashboard,
  Search,
  Settings,
  ShieldAlert,
  Sparkles,
  Upload,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { historyStore } from '@/services/history';
import { api } from '@/services/api';
import { useAsyncData, useDebounced } from '@/hooks/useAsyncData';
import { cx } from '@/components/ui';

interface CommandItem {
  id: string;
  label: string;
  icon: LucideIcon;
  group: string;
  action: () => void;
  keywords?: string;
  detail?: string;
}

export function CommandMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [history, setHistory] = useState(() => historyStore.listLocal());
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const deferredQuery = useDebounced(query.trim(), 180);
  const { data: standardSearch } = useAsyncData(
    open && deferredQuery.length >= 2 ? deferredQuery : null,
    (q) => api.standards({ q, page: 1, pageSize: 5, sort: 'number' }),
    'Unable to search standards.',
  );

  const close = useCallback(() => {
    setQuery('');
    setActive(0);
    onClose();
  }, [onClose]);

  const go = useCallback(
    (path: string) => {
      navigate(path);
      close();
    },
    [close, navigate],
  );

  const items = useMemo<CommandItem[]>(() => {
    const pages: CommandItem[] = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Pages', action: () => go('/'), keywords: 'home' },
      { id: 'analyze', label: 'Analyze Specification', icon: FileSearch, group: 'Pages', action: () => go('/analyze'), keywords: 'search query input' },
      { id: 'upload', label: 'Upload Tender', icon: Upload, group: 'Pages', action: () => go('/upload'), keywords: 'pdf document' },
      { id: 'explorer', label: 'Standards Explorer', icon: BookOpenText, group: 'Pages', action: () => go('/explorer'), keywords: 'browse filter' },
      { id: 'graph', label: 'Relationship Graph', icon: GitFork, group: 'Pages', action: () => go('/graph'), keywords: 'network nodes edges' },
      { id: 'history', label: 'Search History', icon: Clock3, group: 'Pages', action: () => go('/history'), keywords: 'past previous' },
      { id: 'gaps', label: 'Gap Analysis', icon: ShieldAlert, group: 'Pages', action: () => go('/gaps'), keywords: 'missing' },
      { id: 'spec', label: 'Tender Specification', icon: FileText, group: 'Pages', action: () => go('/spec'), keywords: 'generate draft' },
      { id: 'reports', label: 'Reports', icon: FileText, group: 'Pages', action: () => go('/reports'), keywords: 'export summary' },
      { id: 'settings', label: 'Settings', icon: Settings, group: 'Pages', action: () => go('/settings'), keywords: 'preferences theme' },
    ];

    const actions: CommandItem[] = [
      { id: 'new-analysis', label: 'Start new analysis', icon: Sparkles, group: 'Actions', action: () => go('/analyze') },
    ];

    const recent = history.map((e) => ({
      id: `history-${e.id}`,
      label: e.query.slice(0, 80),
      icon: Clock3,
      group: 'Recent Analyses',
      action: () => go(`/results/${e.id}`),
      keywords: e.topStandard ?? '',
    }));

    const standards: CommandItem[] = (standardSearch?.items ?? []).map((standard) => ({
      id: `standard-${standard.id}`,
      label: `${standard.number} — ${standard.title}`,
      detail: standard.category,
      icon: BookOpenText,
      group: 'Standards',
      action: () => go(`/graph?standard=${encodeURIComponent(standard.id)}`),
      keywords: `${standard.title} ${standard.category} ${standard.sector} ${standard.productTypes.join(' ')}`,
    }));

    return [...standards, ...pages, ...actions, ...recent];
  }, [go, history, standardSearch]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q) ||
        (item.keywords && item.keywords.toLowerCase().includes(q)),
    );
  }, [items, query]);

  useEffect(() => {
    if (open) {
      void historyStore.listMerged().then(({ entries }) => setHistory(entries.slice(0, 5)));
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Scroll active item into view.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const run = (index: number) => {
    const item = filtered[index];
    if (item) {
      item.action();
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (a + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (a - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  };

  if (!open) return null;

  // Group items for display.
  const groups = new Map<string, { item: CommandItem; index: number }[]>();
  filtered.forEach((item, index) => {
    const list = groups.get(item.group) ?? [];
    list.push({ item, index });
    groups.set(item.group, list);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh]" role="dialog" aria-modal="true" aria-label="Command menu">
      <button
        aria-label="Close command menu"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={close}
        tabIndex={-1}
      />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-line bg-surface-overlay shadow-pop animate-[fade-up_0.18s_ease-out]"
        onKeyDown={onKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-line px-4">
          <Search className="size-4 text-ink-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder="Type a command or search…"
            className="h-12 flex-1 bg-transparent text-[14px] outline-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-ink-subtle"
            aria-label="Search commands"
          />
          <kbd className="rounded border border-line bg-surface-sunken px-1.5 py-0.5 font-mono text-[10px] text-ink-muted">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-72 overflow-y-auto p-2" role="listbox">
          {filtered.length === 0 && (
            <div className="px-3 py-6 text-center text-[13px] text-ink-muted">
              No results found for "{query}"
            </div>
          )}
          {[...groups.entries()].map(([group, entries]) => (
            <div key={group}>
              <div className="px-2.5 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                {group}
              </div>
              {entries.map(({ item, index }) => (
                <button
                  key={item.id}
                  role="option"
                  aria-selected={index === active}
                  data-active={index === active}
                  onClick={() => run(index)}
                  onMouseEnter={() => setActive(index)}
                  className={cx(
                    'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors',
                    index === active
                      ? 'bg-soft text-soft-fg'
                      : 'text-ink-muted hover:bg-soft/60 hover:text-ink',
                  )}
                >
                  <item.icon className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.detail && <span className="shrink-0 text-[10px] text-ink-subtle">{item.detail}</span>}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-[11px] text-ink-muted">
          <span className="flex items-center gap-1"><kbd className="rounded border border-line bg-surface-sunken px-1 py-px font-mono text-[10px]">↑↓</kbd> Navigate</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-line bg-surface-sunken px-1 py-px font-mono text-[10px]">↵</kbd> Open</span>
          <span className="flex items-center gap-1"><kbd className="rounded border border-line bg-surface-sunken px-1 py-px font-mono text-[10px]">Esc</kbd> Close</span>
        </div>
      </div>
    </div>
  );
}
