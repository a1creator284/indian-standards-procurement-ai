import type { LanguageCode } from '../types';
import { CONCEPTS, HINGLISH_MARKERS, PHRASE_TRANSLATIONS, type Concept } from './lexicon';

const DEVANAGARI = /[ऀ-ॿ]/;

export interface LanguageResult {
  language: LanguageCode;
  /** English-normalised text used for retrieval. Original is always preserved by the caller. */
  normalized: string;
  /** Concept ids detected in the text (any language). */
  concepts: string[];
  note?: string;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Detects English / Hindi / Hinglish using script and marker heuristics. */
export function detectLanguage(text: string): LanguageCode {
  const trimmed = text.trim();
  if (!trimmed) return 'unknown';
  const devanagariChars = (trimmed.match(/\p{Script=Devanagari}/gu) ?? []).length;
  const letters = (trimmed.match(/[\p{L}]/gu) ?? []).length || 1;
  if (devanagariChars / letters > 0.3) return 'hi';

  const tokens = trimmed.toLowerCase().split(/[^a-z\p{Script=Devanagari}]+/u).filter(Boolean);
  const markerHits = tokens.filter((t) => HINGLISH_MARKERS.has(t)).length;
  if (tokens.length > 0 && (markerHits >= 2 || markerHits / tokens.length > 0.15)) return 'hinglish';
  if (devanagariChars > 0) return 'hinglish';
  return 'en';
}


/** Single-pass replacement of Hindi/Hinglish surface forms with canonical English terms. */
let formIndex: { re: RegExp; map: Map<string, string> } | null = null;
function replaceForms(text: string): string {
  if (!formIndex) {
    const map = new Map<string, string>();
    for (const c of CONCEPTS) for (const f of [...c.forms.hi, ...c.forms.hinglish]) map.set(f.toLowerCase(), c.canonical);
    const forms = [...map.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
    // Devanagari forms use script boundaries; Latin forms use alphanumeric boundaries.
    const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${forms.join('|')})(?![\\p{L}\\p{N}])`, 'giu');
    formIndex = { re, map };
  }
  const { re, map } = formIndex;
  return text.replace(re, (m) => map.get(m.toLowerCase()) ?? m);
}

/** Finds concept ids present in text, across all supported languages. */
export function matchConcepts(text: string): Concept[] {
  const lower = text.toLowerCase();
  const hits: Concept[] = [];
  for (const concept of CONCEPTS) {
    const forms = [...concept.forms.en, ...concept.forms.hi, ...concept.forms.hinglish];
    const found = forms.some((form) => {
      const f = form.toLowerCase();
      if (DEVANAGARI.test(f)) return new RegExp(`(?<![\\p{L}])${escapeRegExp(f)}(?![\\p{L}])`, 'u').test(lower);
      // word boundary match for latin forms, tolerant to plural "s"
      const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(f)}s?(?=$|[^a-z0-9])`, 'i');
      return re.test(lower);
    });
    if (found) hits.push(concept);
  }
  return hits;
}

/**
 * Normalises a query into English for retrieval while preserving the original.
 * Hindi / Hinglish surface forms are replaced with the concept's canonical term;
 * common function words are translated; everything else is passed through.
 */
export function normalizeQuery(text: string): LanguageResult {
  const language = detectLanguage(text);
  let normalized = text;

  if (language === 'hi' || language === 'hinglish') {
    normalized = replaceForms(normalized);
    for (const { pattern, replacement } of PHRASE_TRANSLATIONS) {
      normalized = normalized.replace(pattern, ` ${replacement} `);
    }
    // strip leftover Devanagari fragments we couldn't map and squash spaces
    normalized = normalized.replace(/[ऀ-ॿ]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  const concepts = matchConcepts(`${text} ${normalized}`).map((c) => c.id);
  const note =
    language === 'hi'
      ? 'Hindi input normalised to English concepts for retrieval; original preserved.'
      : language === 'hinglish'
        ? 'Hinglish input normalised to English concepts for retrieval; original preserved.'
        : undefined;

  return { language, normalized: normalized || text, concepts, note };
}
