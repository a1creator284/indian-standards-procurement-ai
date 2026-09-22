import type { AnalysisResult, HistoryEntry } from '../src/engine/types';

/**
 * Best-effort persistence of analyses to Supabase. When Supabase is not
 * configured the client keeps history in localStorage instead.
 */
import type { SupabaseClient as Supa } from '@supabase/supabase-js';
let client: Promise<Supa | null> | null = null;

function getClient(): Promise<Supa | null> {
  if (!client) {
    client = (async () => {
      const url = process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return null;
      const { createClient } = await import('@supabase/supabase-js');
      return createClient(url, key, { auth: { persistSession: false } });
    })();
  }
  return client;
}

export function toHistoryEntry(a: AnalysisResult): HistoryEntry {
  return {
    id: a.id,
    query: a.input.fileName ? `${a.input.fileName}: ${a.input.original.slice(0, 120)}` : a.input.original.slice(0, 200),
    createdAt: a.createdAt,
    source: a.input.source,
    language: a.input.language,
    recommendationCount: a.recommendations.length,
    topStandard: a.recommendations[0]?.standard.number ?? null,
    gapCount: a.gaps.length,
    mode: a.provider.mode,
  };
}

export async function persistAnalysis(a: AnalysisResult): Promise<boolean> {
  const supa = await getClient();
  if (!supa) return false;
  try {
    const { error } = await supa.from('analyses').insert({
      id: a.id,
      source: a.input.source,
      language: a.input.language,
      original_input: a.input.original,
      normalized_input: a.input.normalized,
      mode: a.provider.mode,
      summary: a.summary,
      result: a,
      created_at: a.createdAt,
    });
    if (error) throw error;
    const h = toHistoryEntry(a);
    await supa.from('search_history').insert({
      analysis_id: a.id,
      query: h.query,
      source: h.source,
      language: h.language,
      recommendation_count: h.recommendationCount,
      top_standard: h.topStandard,
      gap_count: h.gapCount,
      mode: h.mode,
      created_at: h.createdAt,
    });
    if (a.recommendations.length) {
      await supa.from('recommendations').insert(
        a.recommendations.map((r, i) => ({
          analysis_id: a.id,
          standard_id: r.standard.id,
          role: r.role,
          confidence_total: r.confidence.total,
          confidence_band: r.confidence.band,
          breakdown: r.confidence,
          reasons: r.reasons,
          explanation: r.explanation,
          rank: i + 1,
        })),
      );
    }
    if (a.gaps.length) {
      await supa.from('gap_findings').insert(
        a.gaps.map((g) => ({
          analysis_id: a.id,
          type: g.type,
          severity: g.severity,
          issue: g.issue,
          why_it_matters: g.whyItMatters,
          related_standard_ids: g.relatedStandardIds,
          evidence: g.evidence,
          suggested_action: g.suggestedAction,
        })),
      );
    }
    return true;
  } catch (e) {
    console.warn('[persistence] failed to store analysis:', (e as Error).message);
    return false;
  }
}

export async function listHistory(limit = 50): Promise<HistoryEntry[] | null> {
  const supa = await getClient();
  if (!supa) return null;
  const { data, error } = await supa.from('search_history').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) return null;
  return (data ?? []).map((r) => ({
    id: r.analysis_id ?? r.id,
    query: r.query,
    createdAt: r.created_at,
    source: r.source,
    language: r.language,
    recommendationCount: r.recommendation_count,
    topStandard: r.top_standard,
    gapCount: r.gap_count,
    mode: r.mode,
  }));
}

export async function getAnalysis(id: string): Promise<AnalysisResult | null> {
  const supa = await getClient();
  if (!supa) return null;
  const { data, error } = await supa.from('analyses').select('result').eq('id', id).maybeSingle();
  if (error || !data) return null;
  return data.result as AnalysisResult;
}
