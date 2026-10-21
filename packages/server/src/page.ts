import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { serveStatic } from '@hono/node-server/serve-static';
import type { Hono } from 'hono';

const TOKEN_PLACEHOLDER = '%TRACKER_TOKEN%';

/** Serves the built page (ADR 0028). The token goes into its HTML (ADR 0027), so that HTML is never cached. */
export function mountPage(app: Hono, webRoot: string | undefined, developerToken: string): void {
  const index = webRoot ? join(webRoot, 'index.html') : null;
  app.get('/', (c) => {
    if (index === null || !existsSync(index)) {
      return c.text('La page n’est pas construite : lance « npm run build ».', 404);
    }
    c.header('cache-control', 'no-store');
    return c.html(readFileSync(index, 'utf8').replace(TOKEN_PLACEHOLDER, developerToken));
  });
  if (webRoot) app.use('/assets/*', serveStatic({ root: webRoot }));
}
