/**
 * Parses Indian Standard references from free text, e.g.
 *   "IS 694:2010", "IS 10322 (Part 5/Sec 3) : 2012", "IS/IEC 60529", "IS 1554 Part 1 - 1988".
 */
export interface StandardReference {
  text: string; // original matched text
  base: string; // e.g. "10322" or "IEC 60529"
  part: string | null;
  section: string | null;
  year: number | null;
  /** canonical key used for lookups: "10322|5|3", "iec 60529||" */
  key: string;
}

const REF_RE =
  /\bIS\s*(?:\/\s*(IEC|ISO)\s*)?[:-]?\s*(\d{2,6}(?:-\d{1,2})?)\s*(?:\(?\s*Part\s*(\d{1,2})\s*(?:\/\s*Sec(?:tion)?\s*(\d{1,2}))?\s*\)?)?\s*(?:[:-]\s*((?:19|20)\d{2}))?/gi;

export function extractStandardReferences(text: string): StandardReference[] {
  const out: StandardReference[] = [];
  const seen = new Set<string>();
  for (const m of text.matchAll(REF_RE)) {
    const org = m[1]?.toUpperCase() ?? null;
    const num = m[2];
    const part = m[3] ?? null;
    const section = m[4] ?? null;
    const year = m[5] ? Number(m[5]) : null;
    const base = org ? `${org} ${num}` : num;
    const key = makeKey(base, part, section);
    const dedupeKey = `${key}|${year ?? ''}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({ text: m[0].trim().replace(/\s+/g, ' '), base, part, section, year, key });
  }
  return out;
}

export function makeKey(base: string, part: string | null, section: string | null): string {
  return `${base.toLowerCase().replace(/\s+/g, ' ')}|${part ?? ''}|${section ?? ''}`;
}

/** Builds a lookup key from a display number like "IS 10322 (Part 5/Sec 3)" or "IS/IEC 60898-1". */
export function keyFromStandardNumber(number: string): string {
  const refs = extractStandardReferences(number);
  if (refs.length) return refs[0].key;
  return number.toLowerCase();
}

/** Family key without part/section (used for fuzzy matching when a tender omits the part). */
export function familyKey(key: string): string {
  return key.split('|')[0];
}
