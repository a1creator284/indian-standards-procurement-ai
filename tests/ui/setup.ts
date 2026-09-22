import { buildRouter } from '../../server/routes';
import { setServerContext } from '../../server/config';
import { demoDeps } from '../helpers';

/**
 * Routes `fetch('/api/...')` calls from the UI straight into the real API
 * router (demo context) — full-stack behaviour with no network.
 */
export function installApiFetchMock(): void {
  const { repo, ai } = demoDeps();
  setServerContext({ repo, ai, mode: 'demo', warnings: [], maxUploadMb: 10 });
  const router = buildRouter();
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, 'http://localhost');
    const query: Record<string, string> = {};
    url.searchParams.forEach((v, k) => (query[k] = v));
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    const res = await router.handle({ method: (init?.method ?? 'GET').toUpperCase(), path: url.pathname.replace(/^\/api/, '') || '/', query, body, ip: 'test' });
    return new Response(JSON.stringify(res.body), { status: res.status, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch;
}

/** jsdom lacks a few browser APIs used by the UI. */
export function installBrowserShims(): void {
  if (!('ResizeObserver' in globalThis)) {
    class RO {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.assign(globalThis, { ResizeObserver: RO });
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => {};
  if (!('randomUUID' in crypto)) Object.assign(crypto, { randomUUID: () => Math.random().toString(36).slice(2) });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }),
  });
}
