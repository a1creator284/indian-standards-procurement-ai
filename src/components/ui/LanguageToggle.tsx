import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { cx } from '@/components/ui';
import { useLanguage, type Language } from '@/context/LanguageContext';

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-lang-menu]')) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const options: Array<{ value: Language; label: string }> = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिंदी (Hindi)' },
  ];

  return (
    <div className="relative" data-lang-menu>
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-soft hover:text-ink"
        aria-label="Change language"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Globe className="size-4.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1.5 w-32 overflow-hidden rounded-lg border border-line bg-surface-overlay p-1 shadow-pop animate-fade-in" role="menu">
          {options.map((o) => (
            <button
              key={o.value}
              role="menuitemradio"
              aria-checked={language === o.value}
              onClick={() => {
                setLanguage(o.value);
                setOpen(false);
              }}
              className={cx(
                'flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                language === o.value ? 'bg-soft font-medium text-soft-fg' : 'text-ink-muted hover:bg-soft/60 hover:text-ink',
              )}
            >
              <span className="truncate">{o.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
