import { describe, expect, it } from 'vitest';
import { extractRequirements } from '../../src/engine/extraction/requirements';
import { matchConcepts } from '../../src/engine/language/detect';

describe('Steel Almirah Tender Analysis', () => {
  const tenderText = `
    TENDER DOCUMENT
    Tender for Supply of Steel Almirah
    1. Tender Instructions
    This is an online e-Tender published on the Government e-Marketplace.
    Quantity 30 nos.
    All bids must be submitted on the official Letter Head of the bidder with signature of the Head of the Department.
    Warranty period: 1 year.
    Material: CRCA steel sheet, powder coated.
    Lock: Three-way bolting locking device.
    Test certificate: Routine test and inspection report required.
  `;

  it('does not falsely match LED driver or pumpset on tender boilerplate', () => {
    const concepts = matchConcepts(tenderText);
    const conceptIds = concepts.map((c) => c.id);
    expect(conceptIds).not.toContain('led-driver');
    expect(conceptIds).not.toContain('pump');
    expect(conceptIds).toContain('steel-almirah');
  });

  it('extracts steel almirah as the product requirement', () => {
    const reqs = extractRequirements(tenderText);
    const products = reqs.filter((r) => r.category === 'product');
    expect(products.some((p) => p.text.includes('Steel Almirah'))).toBe(true);
    expect(products.some((p) => p.text.includes('LED driver'))).toBe(false);
    expect(products.some((p) => p.text.includes('pumpset'))).toBe(false);
  });

  it('recommends IS 3312 as top standard for steel almirah tender', async () => {
    const { analyze } = await import('../../src/engine/pipeline');
    const { MemoryStandardsRepository } = await import('../../src/engine/repository/memoryRepository');
    const { loadDemoDataset } = await import('../../src/engine/repository/demoDataset');
    const { LocalEmbeddingProvider } = await import('../../src/engine/providers/localEmbedding');
    const { DemoLLMProvider } = await import('../../src/engine/providers/demo');

    const embeddings = new LocalEmbeddingProvider();
    const repo = new MemoryStandardsRepository(loadDemoDataset(), embeddings);
    const llm = new DemoLLMProvider();

    const result = await analyze({ text: tenderText }, { repo, ai: { llm, embeddings } });
    expect(result.summary.productDescription).toMatch(/Steel Almirah/i);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0].standard.number).toBe('IS 3312');
    expect(result.recommendations[0].confidence.total).toBeGreaterThanOrEqual(60);
  });
});
