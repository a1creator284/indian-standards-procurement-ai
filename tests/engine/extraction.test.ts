import { describe, expect, it } from 'vitest';
import { extractRequirements, mergeRequirements } from '../../src/engine/extraction/requirements';
import { extractStandardReferences, keyFromStandardNumber } from '../../src/engine/extraction/references';
import { normalizeExtracted } from '../../src/engine/providers/normalizeExtracted';
import { CABLE_TENDER, LED_QUERY } from '../helpers';

describe('requirement extraction', () => {
  it('extracts product, parameters and environment from a natural-language query', () => {
    const reqs = extractRequirements(LED_QUERY);
    const byEntity = Object.fromEntries(reqs.map((r) => [r.entity, r]));
    expect(byEntity['ingress protection']?.value).toBe('IP66');
    expect(byEntity['rated power']?.value).toBe('120');
    expect(byEntity['rated power']?.unit).toBe('W');
    expect(reqs.some((r) => r.category === 'product' && r.text.includes('street lighting'))).toBe(true);
    expect(reqs.some((r) => r.category === 'installation')).toBe(true);
    // no duplicates
    const keys = reqs.map((r) => `${r.category}|${r.entity}|${r.value ?? r.text}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('extracts references, ambiguity, quantity and warranty from tender text', () => {
    const reqs = extractRequirements(CABLE_TENDER);
    expect(reqs.filter((r) => r.category === 'reference').map((r) => r.value)).toEqual(expect.arrayContaining(['IS 694:1990', 'IS 7098 (Part 1):1988', 'IS 13947']));
    expect(reqs.find((r) => r.entity === 'conductor size')?.value).toBe('2.5');
    expect(reqs.find((r) => r.entity === 'ambiguous phrase')?.value).toMatch(/reputed make/i);
    expect(reqs.find((r) => r.entity === 'quantity')?.value).toBe('5000');
    expect(reqs.find((r) => r.entity === 'warranty')?.value).toBe('1');
    expect(reqs.some((r) => r.category === 'material' && r.entity?.includes('XLPE'))).toBe(true);
  });

  it('merges LLM requirements without duplicating rule-based ones', () => {
    const base = extractRequirements(LED_QUERY);
    const extra = normalizeExtracted([
      { text: 'Ingress protection rating IP66', category: 'environmental', confidence: 0.9 },
      { text: 'Surge protection 10 kV', category: 'safety', confidence: 0.8 },
      { text: '', category: 'other' },
      { text: 'bad category', category: 'nonsense', confidence: 5 },
    ]);
    expect(extra).toHaveLength(3);
    expect(extra[2].category).toBe('other');
    expect(extra[2].confidence).toBe(1);
    const merged = mergeRequirements(base, extra);
    expect(merged.length).toBe(base.length + 2);
    expect(new Set(merged.map((r) => r.id)).size).toBe(merged.length);
  });
});

describe('standard reference parsing', () => {
  it('parses number, part, section and year variants', () => {
    const refs = extractStandardReferences('as per IS 10322 (Part 5/Sec 3) : 2012, IS/IEC 60529:2001, IS 1554 Part 1 - 1988 and IS 694');
    expect(refs.map((r) => r.key)).toEqual(['10322|5|3', 'iec 60529||', '1554|1|', '694||']);
    expect(refs.map((r) => r.year)).toEqual([2012, 2001, 1988, null]);
  });

  it('builds matching keys from display numbers', () => {
    expect(keyFromStandardNumber('IS 10322 (Part 5/Sec 3)')).toBe('10322|5|3');
    expect(keyFromStandardNumber('IS/IEC 60898-1')).toBe('iec 60898-1||');
    expect(keyFromStandardNumber('IS 1944 (Parts 1 & 2)')).toBe('1944||');
  });

  it('dedupes identical references', () => {
    expect(extractStandardReferences('IS 694:2010 and IS 694 : 2010')).toHaveLength(1);
  });
});
