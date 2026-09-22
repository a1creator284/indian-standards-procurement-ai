import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  /** The user's stored preference. */
  preference: ThemePreference;
  /** The actual theme applied to the document (`light` or `dark`). */
  theme: ResolvedTheme;
  /** Change the stored preference. */
  setPreference: (p: ThemePreference) => void;
}

const STORAGE_KEY = 'iscopilot.theme';
const ThemeContext = createContext<ThemeState | null>(null);

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') return preference;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch {
    /* storage unavailable */
  }
  // Light is the product default so first-time users and evaluators see the
  // clearest, highest-contrast procurement workspace. System remains available
  // as an explicit preference.
  return 'light';
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference);
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolveTheme(readPreference()));

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      /* ignore */
    }
    const resolved = resolveTheme(p);
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Apply theme on mount and listen for system preference changes.
  useEffect(() => {
    applyTheme(resolveTheme(preference));

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (preference === 'system') {
        const resolved = resolveTheme('system');
        setTheme(resolved);
        applyTheme(resolved);
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const value = useMemo<ThemeState>(() => ({ preference, theme, setPreference }), [preference, theme, setPreference]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
