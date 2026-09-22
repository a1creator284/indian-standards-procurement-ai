import type { AnalysisResult, HistoryEntry } from '@/engine/types';
import { api } from './api';

/**
 * Search history + analysis cache. Always stored in localStorage so the app
 * works without a database; merged with server history when Supabase is set up.
 */
const KEY = 'iscopilot.history.v1';
const MAX_ENTRIES = 20;

interface Stored {
  entries: HistoryEntry[];
  analyses: Record<string, AnalysisResult>;
}

function read(): Stored {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Stored;
  } catch {
    /* corrupted or unavailable storage */
  }
  return { entries: [], analyses: {} };
}

function write(data: Stored): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Quota exceeded — drop the oldest analyses and retry once
    const trimmed = { entries: data.entries.slice(0, 5), analyses: {} as Record<string, AnalysisResult> };
    for (const e of trimmed.entries) if (data.analyses[e.id]) trimmed.analyses[e.id] = data.analyses[e.id];
    try {
      localStorage.setItem(KEY, JSON.stringify(trimmed));
    } catch {
      /* give up silently */
    }
  }
}

export function toEntry(a: AnalysisResult): HistoryEntry {
  return {
    id: a.id,
    query: a.input.fileName ? `${a.input.fileName} — ${a.input.original.slice(0, 120)}` : a.input.original.slice(0, 200),
    createdAt: a.createdAt,
    source: a.input.source,
    language: a.input.language,
    recommendationCount: a.recommendations.length,
    topStandard: a.recommendations[0]?.standard.number ?? null,
    gapCount: a.gaps.length,
    mode: a.provider.mode,
  };
}

export const historyStore = {
  save(a: AnalysisResult): void {
    const data = read();
    data.entries = [toEntry(a), ...data.entries.filter((e) => e.id !== a.id)].slice(0, MAX_ENTRIES);
    data.analyses[a.id] = a;
    for (const id of Object.keys(data.analyses)) if (!data.entries.some((e) => e.id === id)) delete data.analyses[id];
    write(data);
  },

  listLocal(): HistoryEntry[] {
    return read().entries;
  },

  getLocal(id: string): AnalysisResult | null {
    return read().analyses[id] ?? null;
  },

  remove(id: string): void {
    const data = read();
    data.entries = data.entries.filter((e) => e.id !== id);
    delete data.analyses[id];
    write(data);
  },

  clear(): void {
    write({ entries: [], analyses: {} });
  },

  /** Local entries merged with server entries (server wins on duplicates). */
  async listMerged(): Promise<{ entries: HistoryEntry[]; persisted: boolean }> {
    const local = read().entries;
    try {
      const { entries, persisted } = await api.history();
      const ids = new Set(entries.map((e) => e.id));
      const merged = [...entries, ...local.filter((e) => !ids.has(e.id))].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { entries: merged, persisted };
    } catch {
      return { entries: local, persisted: false };
    }
  },

  async get(id: string): Promise<AnalysisResult | null> {
    const local = read().analyses[id];
    if (local) return local;
    try {
      const { analysis } = await api.analysis(id);
      return analysis;
    } catch {
      return null;
    }
  },
};
