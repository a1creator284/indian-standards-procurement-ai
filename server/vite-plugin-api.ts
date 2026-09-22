import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer, PreviewServer } from 'vite';
import { createServer, loadEnv } from 'vite';
import type * as HttpModule from './http.ts';
import type * as RoutesModule from './routes.ts';

/**
 * Mounts the API handlers on the Vite dev/preview server at /api/* so the app
 * runs end-to-end with a single `npm run dev`. Handlers are loaded through
 * Vite's SSR module loader (TypeScript + JSON + path aliases, hot reload in dev).
 * Production deployments use `api/index.ts` (Vercel) instead.
 */
export function apiDevPlugin(): Plugin {
  const mount = (loader: () => Promise<ViteDevServer>) => async (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    if (!req.url?.startsWith('/api/')) return next();
    try {
      const vite = await loader();
      const [http, routes] = await Promise.all([
        vite.ssrLoadModule('/server/http.ts') as Promise<typeof HttpModule>,
        vite.ssrLoadModule('/server/routes.ts') as Promise<typeof RoutesModule>,
      ]);
      try {
        const apiReq = await http.readNodeRequest(req);
        http.writeNodeResponse(res, await routes.buildRouter().handle(apiReq));
      } catch (e) {
        http.writeNodeResponse(res, http.toErrorResponse(e));
      }
    } catch (e) {
      console.error('[api] failed to load handlers', e);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'API failed to initialise', code: 'internal' }));
    }
  };

  return {
    name: 'is-copilot-api',
    config(_config, { mode }) {
      // Make server-only env vars from .env available to process.env (never to the client bundle).
      const env = loadEnv(mode, process.cwd(), '');
      for (const [k, v] of Object.entries(env)) if (process.env[k] === undefined) process.env[k] = v;
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(mount(async () => server));
    },
    configurePreviewServer(server: PreviewServer) {
      // `vite preview` has no module loader, so lazily start a middleware-mode Vite instance for the API only.
      let loaderPromise: Promise<ViteDevServer> | null = null;
      const loader = () =>
        (loaderPromise ??= createServer({
          configFile: false,
          plugins: [],
          server: { middlewareMode: true, hmr: false },
          appType: 'custom',
          logLevel: 'warn',
          resolve: { alias: { '@': new URL('../src', import.meta.url).pathname } },
        }));
      server.middlewares.use(mount(loader));
    },
  };
}
