import { describe, expect, it } from 'vitest';
import { detectOutdatedReferences } from '../../src/engine/analysis/outdated';
import { analyzeGaps } from '../../src/engine/analysis/gaps';
import { loadDemoDataset } from '../../src/engine/repository/demoDataset';
import { normalizeDataset, type RawDatasetInput } from '../../src/engine/repository/normalize';
import { extractRequirements } from '../../src/engine/extraction/requirements';
import { CABLE_TENDER, LED_QUERY, runDemoAnalysis } from '../helpers';
import { generateSpecification, specToMarkdown } from '../../src/engine/generation/spec';
import { answerQuestion } from '../../src/engine/chat/answer';
import { demoDeps } from '../helpers';

const ds = loadDemoDataset();

describe('outdated-reference detection', () => {
  it('classifies references relative to the indexed dataset', () => {
    const out = detectOutdatedReferences('as per IS 694:1990, IS 7098 (Part 1):1988, IS 13947, IS 4985:2030, IS 99999:2001 and IS 3043', ds.standards, ds.relationships);
    const byRef = Object.fromEntries(out.map((o) => [o.referenceText, o]));
    expect(byRef['IS 694:1990'].status).toBe('potentially-outdated');
    expect(byRef['IS 694:1990'].indexedLatestYear).toBe(2010);
    expect(byRef['IS 7098 (Part 1):1988'].status).toBe('matches-indexed');
    expect(byRef['IS 13947'].status).toBe('superseded');
    expect(byRef['IS 13947'].supersededById).toBe('is-iec-60947-1');
    expect(byRef['IS 4985:2030'].status).toBe('newer-than-indexed');
    expect(byRef['IS 99999:2001'].status).toBe('not-in-index');
    expect(byRef['IS 3043'].status).toBe('year-not-specified');
    for (const o of out) {
      expect(o.evidence.length).toBeGreaterThan(10);
      expect(o.recommendedAction.length).toBeGreaterThan(10);
    }
  });

  it('never claims official currency', () => {
    const out = detectOutdatedReferences('IS 694:2010', ds.standards, ds.relationships);
    expect(out[0].status).toBe('matches-indexed');
    expect(out[0].recommendedAction).toMatch(/verify/i);
  });
});

describe('dataset normalisation', () => {
  it('drops dangling relationships and marks superseded standards', () => {
    const input: RawDatasetInput = {
      standards: [
        { id: 'a', number: 'IS 1', title: 'A', category: 'product', sector: 'general', year: 2000 },
        { id: 'b', number: 'IS 2', title: 'B', category: 'product', sector: 'general', year: 2010 },
        { id: 'a', number: 'IS 1', title: 'A dup', category: 'product', sector: 'general', year: 2001 },
      ],
      relationships: [
        { from: 'a', to: 'b', type: 'superseded_by' },
        { from: 'a', to: 'zzz', type: 'allied' },
        { from: 'a', to: 'b', type: 'superseded_by' },
      ],
      certifications: [{ id: 'c1', scheme: 'BIS-ISI', name: 'ISI', authority: 'BIS', description: '' }],
      standardCertifications: [
        { standardId: 'b', certificationId: 'c1', applicability: 'indexed-listed', evidence: 'e' },
        { standardId: 'b', certificationId: 'nope', applicability: 'unknown', evidence: 'e' },
      ],
    };
    const { dataset, report } = normalizeDataset(input, '2026-01-01T00:00:00Z');
    expect(report.duplicateStandards).toEqual(['a']);
    expect(report.droppedRelationships).toHaveLength(1);
    expect(report.droppedCertifications).toHaveLength(1);
    expect(dataset.relationships).toHaveLength(1);
    expect(dataset.standards.find((s) => s.id === 'a')!.revisionStatus).toBe('superseded');
    expect(dataset.standards.find((s) => s.id === 'a')!.title).toBe('A dup');
    expect(dataset.standards.find((s) => s.id === 'b')!.source.type).toBe('demo-dataset');
  });

  it('bundled demo dataset is internally consistent', () => {
    const ids = new Set(ds.standards.map((s) => s.id));
    for (const r of ds.relationships) {
      expect(ids.has(r.from)).toBe(true);
      expect(ids.has(r.to)).toBe(true);
    }
    for (const c of ds.standardCertifications) expect(ids.has(c.standardId)).toBe(true);
    expect(ds.standards.every((s) => s.isDemo)).toBe(true);
    expect(ds.meta.disclaimer).toMatch(/DEMO/);
  });
});

describe('gap analysis', () => {
  it('flags outdated references, missing tests/safety and ambiguity for a tender', async () => {
    const a = await runDemoAnalysis(CABLE_TENDER, 'paste');
    const types = a.gaps.map((g) => g.type);
    expect(types).toContain('outdated-reference');
    expect(types).toContain('ambiguous-requirement');
    expect(types).toContain('missing-test');
    expect(a.gaps.every((g) => g.evidence && g.suggestedAction && g.whyItMatters)).toBe(true);
    expect(a.gaps[0].severity).toBe('high');
    // cautious wording — no legal claims
    expect(a.gaps.some((g) => /must comply|legally required/i.test(g.issue))).toBe(false);
  });

  it('does not flag installation when installation is mentioned', () => {
    const requirements = extractRequirements(LED_QUERY);
    const gaps = analyzeGaps({ source: 'text', text: LED_QUERY, requirements, primaries: [], expansions: new Map(), certifications: [], outdated: [], sectors: ['lighting'] });
    expect(gaps.some((g) => g.type === 'missing-installation')).toBe(false);
  });
});

describe('end-to-end demo pipeline', () => {
  it('produces a complete, explainable report for the judge demo query', async () => {
    const a = await runDemoAnalysis(LED_QUERY);
    expect(a.provider.mode).toBe('demo');
    expect(a.recommendations[0].standard.number).toBe('IS 10322 (Part 5/Sec 3)');
    expect(a.recommendations[0].confidence.band).toBe('very-high');
    expect(a.recommendations[0].explanation).toMatch(/Recommended because/);
    expect(a.recommendations[0].reasons.length).toBeGreaterThan(2);
    expect(a.recommendations[0].relationships.length).toBeGreaterThan(5);
    expect(a.recommendations[0].certifications[0].certification.scheme).toBe('BIS-CRS');
    expect(a.recommendations.every((r) => r.confidence.total >= 45)).toBe(true);
    expect(a.related.length).toBeGreaterThan(5);
    expect(a.related.every((r) => !a.recommendations.some((p) => p.standard.id === r.standard.id))).toBe(true);
    expect(a.graph.nodes.length).toBeGreaterThan(10);
    expect(a.summary.headline).toContain('IS 10322');
    expect(a.disclaimer).toMatch(/Verify/);
    expect(Object.keys(a.timingsMs)).toEqual(expect.arrayContaining(['retrieval', 'rerank']));
  });

  it('handles nonsense input gracefully', async () => {
    const a = await runDemoAnalysis('zzzz qqqq xxxx');
    expect(a.recommendations.length).toBeLessThanOrEqual(1);
    expect(a.summary.headline).toBeTruthy();
  });

  it('works for Hindi input', async () => {
    const a = await runDemoAnalysis('नगर निगम की सड़कों के लिए एलईडी स्ट्रीट लाइट, 120 वाट, जलरोधक, बाहरी स्थापना');
    expect(a.input.language).toBe('hi');
    expect(a.input.original).toMatch(/\p{Script=Devanagari}/u);
    expect(a.recommendations[0].standard.id).toBe('is-10322-5-3');
  });
});

describe('specification generation & chat', () => {
  it('builds nine editable sections with the disclaimer in demo mode', async () => {
    const a = await runDemoAnalysis(CABLE_TENDER, 'paste');
    const spec = await generateSpecification(a, demoDeps().ai.llm);
    expect(spec.mode).toBe('demo');
    expect(spec.sections).toHaveLength(9);
    expect(spec.sections[2].content).toContain('IS 7098 (Part 1)');
    expect(spec.sections[8].content).toMatch(/IS 694:1990/);
    expect(spec.disclaimer).toMatch(/AI-generated draft/);
    const md = specToMarkdown(spec);
    expect(md.startsWith('# Technical Specification')).toBe(true);
    expect(md).toContain('## 6. Certification Information');
  });

  it('answers intent questions from analysis evidence with citations', async () => {
    const a = await runDemoAnalysis(CABLE_TENDER, 'paste');
    const deps = demoDeps();
    const why = await answerQuestion({ question: 'Why was IS 694 recommended?', analysis: a }, deps);
    expect(why.content).toContain('IS 694');
    expect(why.citations!.length).toBeGreaterThan(0);
    const outdated = await answerQuestion({ question: 'Is any reference potentially outdated?', analysis: a }, deps);
    expect(outdated.content).toContain('IS 694:1990');
    expect(outdated.content).toMatch(/potentially outdated/);
    const tests = await answerQuestion({ question: 'What testing standards are related?', analysis: a }, deps);
    expect(tests.content).toContain('IS 10810');
    const none = await answerQuestion({ question: 'Which requirements are missing?', analysis: null }, deps);
    expect(none.content).toMatch(/Run an analysis first/);
    const search = await answerQuestion({ question: 'standards for solar inverter', analysis: null }, deps);
    expect(search.content).toContain('IS 16221');
  });
});
