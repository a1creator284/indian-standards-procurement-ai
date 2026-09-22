import { beforeAll, describe, expect, it } from 'vitest';
import { buildRouter } from '../../server/routes';
import { setServerContext } from '../../server/config';
import { rateLimiter, type ApiRequest } from '../../server/http';
import { demoDeps, LED_QUERY } from '../helpers';
import type { AnalysisResult } from '../../src/engine/types';

const req = (method: string, path: string, body?: unknown, query: Record<string, string> = {}, ip = '127.0.0.1'): ApiRequest => ({ method, path, body, query, ip });

describe('API router', () => {
  const router = buildRouter();
  beforeAll(() => {
    const { repo, ai } = demoDeps();
    setServerContext({ repo, ai, mode: 'demo', warnings: [], maxUploadMb: 10 });
  });

  it('reports status without leaking secrets', async () => {
    const res = await router.handle(req('GET', '/status'));
    expect(res.status).toBe(200);
    const body = res.body as Record<string, unknown>;
    expect(body.mode).toBe('demo');
    expect(JSON.stringify(body)).not.toMatch(/sk-|service_role|API_KEY/i);
    expect((body.dataset as { standardCount: number }).standardCount).toBeGreaterThan(50);
  });

  it('validates analyze input', async () => {
    const short = await router.handle(req('POST', '/analyze', { text: 'x' }));
    expect(short.status).toBe(400);
    expect((short.body as { code: string }).code).toBe('validation');
    const missing = await router.handle(req('POST', '/analyze', {}));
    expect(missing.status).toBe(400);
    const badSource = await router.handle(req('POST', '/analyze', { text: 'LED street light', source: 'email' }));
    expect(badSource.status).toBe(400);
  });

  it('runs an analysis and returns the full report', async () => {
    const res = await router.handle(req('POST', '/analyze', { text: LED_QUERY }));
    expect(res.status).toBe(200);
    const a = res.body as AnalysisResult;
    expect(a.recommendations[0].standard.id).toBe('is-10322-5-3');
    expect(a.gaps.length).toBeGreaterThan(0);

    const spec = await router.handle(req('POST', '/spec', { analysis: a }));
    expect(spec.status).toBe(200);
    expect((spec.body as { sections: unknown[] }).sections).toHaveLength(9);

    const chat = await router.handle(req('POST', '/chat', { question: 'Why was the top standard recommended?', analysis: a }));
    expect(chat.status).toBe(200);
    expect((chat.body as { content: string }).content).toContain('IS 10322');
  });

  it('lists, filters and paginates standards', async () => {
    const all = await router.handle(req('GET', '/standards', undefined, { pageSize: '5', page: '2' }));
    const body = all.body as { items: unknown[]; total: number; page: number };
    expect(body.items).toHaveLength(5);
    expect(body.page).toBe(2);
    const filtered = await router.handle(req('GET', '/standards', undefined, { sector: 'lighting', category: 'test-method' }));
    const items = (filtered.body as { items: { id: string }[] }).items;
    expect(items.map((i) => i.id)).toContain('is-16106');
    const search = await router.handle(req('GET', '/standards', undefined, { q: '10322' }));
    expect((search.body as { items: { id: string }[] }).items[0].id).toMatch(/is-10322/);
    const facets = await router.handle(req('GET', '/standards/facets'));
    expect((facets.body as { sectors: unknown[] }).sectors.length).toBeGreaterThan(5);
    const bad = await router.handle(req('GET', '/standards', undefined, { pageSize: '999' }));
    expect(bad.status).toBe(400);
  });

  it('returns standard detail with relationships, certifications and graph', async () => {
    const res = await router.handle(req('GET', '/standards/is-10322-5-3'));
    expect(res.status).toBe(200);
    const body = res.body as { relationships: unknown[]; certifications: unknown[]; graph: { nodes: unknown[] } };
    expect(body.relationships.length).toBeGreaterThan(5);
    expect(body.certifications).toHaveLength(1);
    expect(body.graph.nodes.length).toBeGreaterThan(5);
    const missing = await router.handle(req('GET', '/standards/does-not-exist'));
    expect(missing.status).toBe(404);
  });

  it('returns 404 for unknown routes and empty history without Supabase', async () => {
    expect((await router.handle(req('GET', '/nope'))).status).toBe(404);
    const hist = await router.handle(req('GET', '/history'));
    expect(hist.body).toEqual({ entries: [], persisted: false });
    expect((await router.handle(req('GET', '/history/abc'))).status).toBe(404);
  });

  it('rate limits abusive clients without exposing stack traces', async () => {
    let last = 200;
    for (let i = 0; i < 70; i++) {
      last = (await router.handle(req('GET', '/status', undefined, {}, '10.0.0.9'))).status;
    }
    expect(last).toBe(429);
    expect(rateLimiter.allow('10.0.0.9')).toBe(false);
  });
});
