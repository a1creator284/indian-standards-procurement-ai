import { useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Loads data for a `key`; loading is derived (no synchronous setState inside
 * the effect) and results for stale keys are ignored. `key === null` disables loading.
 */
export function useAsyncData<T>(key: string | null, loader: (key: string) => Promise<T>, errorMessage = 'Failed to load data.'): AsyncState<T> {
  const [state, setState] = useState<{ key: string; data: T | null; error: string | null; attempt: number }>({ key: '', data: null, error: null, attempt: -1 });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    loader(key)
      .then((data) => !cancelled && setState({ key, data, error: null, attempt }))
      .catch((e: unknown) => !cancelled && setState({ key, data: null, error: e instanceof Error ? e.message : errorMessage, attempt }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loader identity is intentionally ignored; key + attempt drive reloads
  }, [key, attempt]);

  const fresh = key !== null && state.key === key && state.attempt === attempt;
  return {
    data: fresh ? state.data : null,
    error: fresh ? state.error : null,
    loading: key !== null && !fresh,
    reload: () => setAttempt((a) => a + 1),
  };
}

/** Debounces a value; the timer callback (not the effect body) commits state. */
export function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
