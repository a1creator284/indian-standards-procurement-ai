import type { AnalysisResult, ChatMessage, ExpandedRelationship, CertificationFinding, GeneratedSpec, HistoryEntry, InputSource, KnowledgeGraph, Standard } from '@/engine/types';
import type { PagedResult, StandardsQuery } from '@/engine/repository/types';

/** Typed client for the server API. Errors are normalised into `ApiError` with human-readable messages. */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = 'error',
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface StatusResponse {
  ok: boolean;
  mode: 'demo' | 'live';
  llm: string;
  embeddings: string;
  repository: string;
  dataset: { name: string; version: string; standardCount: number; disclaimer: string };
  warnings: string[];
  maxUploadMb: number;
  persistence: boolean;
}

export interface StandardDetailResponse {
  standard: Standard;
  relationships: ExpandedRelationship[];
  certifications: CertificationFinding[];
  graph: KnowledgeGraph;
}

export interface FacetsResponse {
  categories: { value: string; count: number }[];
  sectors: { value: string; count: number }[];
  revisionStatuses: { value: string; count: number }[];
  certifications: { value: string; label: string }[];
  total: number;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiError('Cannot reach the IS Copilot API. Check that the dev server is running.', 0, 'network');
  }
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok) {
    const err = data as { error?: string; code?: string } | null;
    throw new ApiError(err?.error ?? `Request failed (${res.status})`, res.status, err?.code ?? 'error');
  }
  return data as T;
}

export const api = {
  status: () => request<StatusResponse>('/status'),

  analyze: (text: string, source: InputSource = 'text', fileName?: string) =>
    request<AnalysisResult>('/analyze', { method: 'POST', body: JSON.stringify({ text, source, fileName }) }),

  standards: (query: StandardsQuery) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
    return request<PagedResult<Standard>>(`/standards?${params.toString()}`);
  },

  facets: () => request<FacetsResponse>('/standards/facets'),

  standard: (id: string) => request<StandardDetailResponse>(`/standards/${encodeURIComponent(id)}`),

  spec: (analysis: AnalysisResult) => request<GeneratedSpec>('/spec', { method: 'POST', body: JSON.stringify({ analysis }) }),

  chat: (question: string, analysis: AnalysisResult | null, history: ChatMessage[]) =>
    request<ChatMessage>('/chat', { method: 'POST', body: JSON.stringify({ question, analysis, history: history.slice(-10) }) }),

  history: () => request<{ entries: HistoryEntry[]; persisted: boolean }>('/history'),

  analysis: (id: string) => request<{ analysis: AnalysisResult; entry: HistoryEntry }>(`/history/${encodeURIComponent(id)}`),
};
