import { describe, expect, it } from 'vitest';
import { bandFor, computeConfidence, CONFIDENCE_WEIGHTS } from '../../src/engine/ranking/confidence';
import { retrieveCandidates, inferSectors } from '../../src/engine/retrieval/retrieve';
import { rerankCandidates } from '../../src/engine/ranking/rerank';
import { extractRequirements } from '../../src/engine/extraction/requirements';
import { expandRelationships, buildKnowledgeGraph } from '../../src/engine/graph/expand';
import { findCertifications } from '../../src/engine/analysis/certifications';
import { demoDeps, LED_QUERY } from '../helpers';
import type { EmbeddingProvider, LLMProvider } from '../../src/engine/providers/types';
import { AIProviderError } from '../../src/engine/providers/types';

describe('confidence model', () => {
  it('weights sum to one and bands are monotonic', () => {
    expect(Object.values(CONFIDENCE_WEIGHTS).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    expect(bandFor(85)).toBe('very-high');
    expect(bandFor(70)).toBe('high');
    expect(bandFor(50)).toBe('medium');
    expect(bandFor(30)).toBe('low');
  });
  it('clamps components and scores 0..100', () => {
    const full = computeConfidence({ semantic: 1, metadata: 1, category: 1, coverage: 1, relationship: 1, evidence: 1 });
    expect(full.total).toBe(100);
    const none = computeConfidence({ semantic: -1, metadata: NaN, category: 0, coverage: 0, relationship: 0, evidence: 0 });
    expect(none.total).toBe(0);
    expect(none.band).toBe('low');
  });
});

describe('vector retrieval', () => {
  it('returns the street-lighting standard first for the LED query', async () => {
    const { repo, ai } = demoDeps();
    const { candidates, sectors } = await retrieveCandidates(LED_QUERY, repo, ai.embeddings, { topK: 8 });
    expect(candidates[0].standard.id).toBe('is-10322-5-3');
    expect(sectors[0]).toBe('lighting');
    expect(candidates.length).toBeLessThanOrEqual(8);
    expect(candidates.every((c, i, arr) => i === 0 || arr[i - 1].semanticScore >= c.semanticScore)).toBe(true);
  });

  it('falls back to lexical search when embeddings fail', async () => {
    const { repo } = demoDeps();
    const broken: EmbeddingProvider = {
      name: 'broken',
      model: 'x',
      dimensions: 1,
      embed: async () => {
        throw new AIProviderError('down', 'unavailable');
      },
    };
    const { candidates, usedFallback } = await retrieveCandidates('XLPE cable', repo, broken);
    expect(usedFallback).toBe(true);
    expect(candidates.some((c) => c.standard.id === 'is-7098-1')).toBe(true);
  });

  it('infers sectors from concepts', () => {
    expect(inferSectors('submersible pump for borewell')[0]).toBe('mechanical');
    expect(inferSectors('TMT bars Fe 500 and cement')[0]).toBe('civil');
  });
});

describe('reranking', () => {
  it('blends provider scores with metadata, coverage and evidence', async () => {
    const { repo, ai } = demoDeps();
    const { candidates, sectors } = await retrieveCandidates(LED_QUERY, repo, ai.embeddings);
    const requirements = extractRequirements(LED_QUERY);
    const rels = await repo.getRelationshipsFor(candidates.map((c) => c.standard.id));
    const { ranked, rerankFailed } = await rerankCandidates(candidates, { query: LED_QUERY, requirements, sectors, relationships: rels }, ai.llm);
    expect(rerankFailed).toBe(false);
    expect(ranked[0].standard.id).toBe('is-10322-5-3');
    expect(ranked[0].confidence.band).toMatch(/high/);
    expect(ranked[0].matchedRequirementIds.length).toBeGreaterThan(0);
    expect(ranked[0].evidence.length).toBeGreaterThan(0);
    expect(ranked[0].evidence[0].source.type).toBe('demo-dataset');
  });

  it('degrades to retrieval-only when the LLM rerank throws', async () => {
    const { repo, ai } = demoDeps();
    const { candidates, sectors } = await retrieveCandidates(LED_QUERY, repo, ai.embeddings);
    const failing: LLMProvider = {
      name: 'failing',
      isLive: true,
      generate: async () => '',
      rerank: async () => {
        throw new AIProviderError('rate', 'rate-limit');
      },
      extractRequirements: async () => [],
      translate: async (t) => t,
    };
    const { ranked, rerankFailed, rerankUsed } = await rerankCandidates(candidates, { query: LED_QUERY, requirements: [], sectors, relationships: [] }, failing);
    expect(rerankFailed).toBe(true);
    expect(rerankUsed).toBe('retrieval-only');
    expect(ranked[0].standard.id).toBe('is-10322-5-3');
  });
});

describe('relationship expansion & graph', () => {
  it('expands typed relationships one hop and builds a layered graph', async () => {
    const { repo } = demoDeps();
    const std = (await repo.getStandard('is-10322-5-3'))!;
    const { byStandard, related } = await expandRelationships([std], repo);
    const rels = byStandard.get(std.id)!;
    const types = new Set(rels.map((r) => r.type));
    expect(types).toEqual(expect.any(Set));
    for (const t of ['normative_reference', 'test_method', 'safety', 'installation', 'terminology', 'allied', 'related_product']) expect(types.has(t as never)).toBe(true);
    expect(related.has('is-iec-60529')).toBe(true);
    const certs = await findCertifications([std, ...related.values()], repo);
    const graph = buildKnowledgeGraph('LED street light', [std], byStandard, certs);
    expect(graph.nodes[0].kind).toBe('product');
    expect(graph.nodes.filter((n) => n.kind === 'primary')).toHaveLength(1);
    expect(graph.nodes.some((n) => n.kind === 'certification')).toBe(true);
    expect(graph.edges.every((e) => graph.nodes.some((n) => n.id === e.source) && graph.nodes.some((n) => n.id === e.target))).toBe(true);
    expect(new Set(graph.edges.map((e) => e.id)).size).toBe(graph.edges.length);
  });

  it('surfaces supersession as an incoming relationship on the successor', async () => {
    const { repo } = demoDeps();
    const successor = (await repo.getStandard('is-iec-60947-1'))!;
    const { byStandard } = await expandRelationships([successor], repo);
    expect(byStandard.get(successor.id)!.some((r) => r.type === 'superseded_by' && r.standard.id === 'is-13947-1' && r.direction === 'incoming')).toBe(true);
  });
});

describe('certifications', () => {
  it('only reports indexed mappings and orders mandatory first', async () => {
    const { repo } = demoDeps();
    const stds = await repo.getStandards(['is-269', 'is-10322-5-3', 'is-1944-1-2']);
    const certs = await findCertifications(stds, repo);
    expect(certs.map((c) => c.standardId)).toEqual(['is-269', 'is-10322-5-3']);
    expect(certs[0].applicability).toBe('indexed-mandatory');
    expect(certs[1].certification.scheme).toBe('BIS-CRS');
    expect(certs.some((c) => c.standardId === 'is-1944-1-2')).toBe(false);
  });
});
