import { describe, expect, it } from 'vitest';
import { detectLanguage, matchConcepts, normalizeQuery } from '../../src/engine/language/detect';
import { cosine, localEmbed } from '../../src/engine/embeddings/local';
import { chunkText, cleanText } from '../../src/engine/text/clean';

describe('language detection & normalisation', () => {
  it('detects English, Hindi and Hinglish', () => {
    expect(detectLanguage('LED street light 120W IP66')).toBe('en');
    expect(detectLanguage('सड़क के लिए एलईडी स्ट्रीट लाइट चाहिए')).toBe('hi');
    expect(detectLanguage('sadak ke liye LED street light chahiye 120W')).toBe('hinglish');
    expect(detectLanguage('')).toBe('unknown');
  });

  it('normalises Hindi to English concepts and preserves numbers', () => {
    const r = normalizeQuery('नगर निगम की सड़कों के लिए एलईडी स्ट्रीट लाइट, 120 वाट, जलरोधक');
    expect(r.language).toBe('hi');
    expect(r.normalized).toContain('street lighting luminaire');
    expect(r.normalized).toContain('ingress protection');
    expect(r.normalized).toContain('120');
    expect(r.normalized).not.toMatch(/\p{Script=Devanagari}/u);
    expect(r.concepts).toContain('street-light');
    // "जल" inside "जलरोधक" must not match the water concept
    expect(r.concepts).not.toContain('water-supply');
  });

  it('normalises Hinglish without double-replacing canonical terms', () => {
    const r = normalizeQuery('sadak ke liye LED street light chahiye 120W waterproof, pole ke saath');
    expect(r.language).toBe('hinglish');
    expect(r.normalized).toContain('ingress protection (IP rating)');
    expect(r.normalized).not.toContain('ingress protection (ingress protection');
    expect(r.normalized).toContain('lighting pole');
  });

  it('matches concepts with word boundaries', () => {
    const ids = matchConcepts('Supply of XLPE cable for pump motor').map((c) => c.id);
    expect(ids).toEqual(expect.arrayContaining(['xlpe', 'cable', 'pump', 'motor']));
    expect(matchConcepts('capable').map((c) => c.id)).not.toContain('cable');
  });
});

describe('local embeddings', () => {
  it('produces unit vectors with semantic-lite similarity', () => {
    const a = localEmbed('LED street light luminaire IP66 outdoor');
    const b = localEmbed('Luminaires for road and street lighting, ingress protection');
    const c = localEmbed('Ordinary Portland cement 53 grade');
    const norm = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
    expect(norm).toBeCloseTo(1, 5);
    expect(cosine(a, b)).toBeGreaterThan(cosine(a, c));
    expect(cosine(a, a)).toBeCloseTo(1, 5);
  });

  it('is deterministic', () => {
    expect(localEmbed('hello world')).toEqual(localEmbed('hello world'));
  });
});

describe('text utilities', () => {
  it('cleans control characters and PDF hyphenation', () => {
    expect(cleanText('lumi-\nnaire\u0000  test')).toBe('luminaire test');
  });
  it('chunks long text with overlap and never drops content', () => {
    const text = Array.from({ length: 60 }, (_, i) => `Clause ${i + 1}. The luminaire shall comply with the requirements of this specification.`).join(' ');
    const chunks = chunkText(text, 500, 80);
    expect(chunks.length).toBeGreaterThan(3);
    expect(chunks[0].text).toContain('Clause 1.');
    expect(chunks.at(-1)!.text).toContain('Clause 60.');
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(520);
  });
});
