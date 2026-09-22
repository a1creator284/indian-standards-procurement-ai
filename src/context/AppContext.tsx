import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AnalysisResult, InputSource } from '@/engine/types';
import { api, ApiError, type StatusResponse } from '@/services/api';
import { historyStore } from '@/services/history';

interface AppState {
  status: StatusResponse | null;
  statusError: string | null;
  analysis: AnalysisResult | null;
  analysing: boolean;
  analysisError: string | null;
  runAnalysis: (text: string, source?: InputSource, fileName?: string) => Promise<AnalysisResult>;
  loadAnalysis: (id: string) => Promise<AnalysisResult | null>;
  setAnalysis: (a: AnalysisResult | null) => void;
  clearError: () => void;
  refreshStatus: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysing, setAnalysing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const refreshStatus = useCallback(
    () =>
      api
        .status()
        .then((s) => {
          setStatus(s);
          setStatusError(null);
        })
        .catch((e: unknown) => setStatusError(e instanceof ApiError ? e.message : 'Unable to read system status.')),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    api
      .status()
      .then((s) => {
        if (cancelled) return;
        setStatus(s);
        setStatusError(null);
      })
      .catch((e: unknown) => !cancelled && setStatusError(e instanceof ApiError ? e.message : 'Unable to read system status.'));
    return () => {
      cancelled = true;
    };
  }, []);

  const runAnalysis = useCallback(async (text: string, source: InputSource = 'text', fileName?: string) => {
    inFlight.current?.abort();
    inFlight.current = new AbortController();
    setAnalysing(true);
    setAnalysisError(null);
    try {
      const result = await api.analyze(text, source, fileName);
      historyStore.save(result);
      setAnalysis(result);
      return result;
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Analysis failed. Please try again.';
      setAnalysisError(message);
      throw e;
    } finally {
      setAnalysing(false);
    }
  }, []);

  const loadAnalysis = useCallback(
    async (id: string) => {
      if (analysis?.id === id) return analysis;
      const found = await historyStore.get(id);
      if (found) setAnalysis(found);
      return found;
    },
    [analysis],
  );

  const value = useMemo<AppState>(
    () => ({
      status,
      statusError,
      analysis,
      analysing,
      analysisError,
      runAnalysis,
      loadAnalysis,
      setAnalysis,
      clearError: () => setAnalysisError(null),
      refreshStatus,
    }),
    [status, statusError, analysis, analysing, analysisError, runAnalysis, loadAnalysis, refreshStatus],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
