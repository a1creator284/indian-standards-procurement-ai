import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import type { AnalysisResult } from '@/engine/types';
import { useApp } from '@/context/AppContext';

/**
 * Resolves the analysis for a page: the `:id` route param (from history or a
 * shared link) or the current analysis in context. Loading state is derived.
 */
export function useAnalysisRoute(): { analysis: AnalysisResult | null; loading: boolean; notFound: boolean } {
  const { id } = useParams<{ id?: string }>();
  const { analysis, loadAnalysis } = useApp();
  const [resolved, setResolved] = useState<{ id: string; found: boolean } | null>(null);

  useEffect(() => {
    if (!id || analysis?.id === id) return;
    let cancelled = false;
    loadAnalysis(id).then((a) => !cancelled && setResolved({ id, found: Boolean(a) }));
    return () => {
      cancelled = true;
    };
  }, [id, analysis?.id, loadAnalysis]);

  if (!id) return { analysis, loading: false, notFound: false };
  if (analysis?.id === id) return { analysis, loading: false, notFound: false };
  const done = resolved?.id === id;
  return { analysis: null, loading: !done, notFound: done && !resolved!.found };
}
