import { useCallback, useState } from 'react';

/** Shared open/close state for the standard detail drawer. */
export function useStandardDrawer() {
  const [id, setId] = useState<string | null>(null);
  const open = useCallback((next: string) => setId(next), []);
  const close = useCallback(() => setId(null), []);
  return { id, open, close };
}
