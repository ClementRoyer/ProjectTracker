import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '@project-tracker/core/store';
import { createApp } from '../src/app';
import { parseConfig } from '../src/config';

const DEVELOPER = 'developer-token-for-tests';
const HOST = { host: '127.0.0.1:9620' };

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

const builtPage = (): string => {
  const folder = mkdtempSync(join(tmpdir(), 'tracker-web-'));
  folders.push(folder);
  mkdirSync(join(folder, 'assets'));
  writeFileSync(
    join(folder, 'index.html'),
    '<meta name="tracker-token" content="%TRACKER_TOKEN%"><div id="app"></div>',
  );
  writeFileSync(join(folder, 'assets', 'page.js'), 'console.log("page");');
  return folder;
};

const setUp = (webRoot?: string): ReturnType<typeof createApp> => {
  const config = parseConfig({});
  if (!config.ok) throw new Error(config.error);
  return createApp({
    db: openDatabase(':memory:'),
    config: config.value,
    developerToken: DEVELOPER,
    ...(webRoot ? { webRoot } : {}),
  });
};

describe('the page (ADR 0027, 0028)', () => {
  it('hands the developer token to the page in its HTML, never cached', async () => {
    const response = await setUp(builtPage()).request('/', { headers: HOST });
    expect(response.status).toBe(200);
    expect(await response.text()).toContain(`content="${DEVELOPER}"`);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('serves the built files of the page', async () => {
    const response = await setUp(builtPage()).request('/assets/page.js', { headers: HOST });
    expect(await response.text()).toContain('page');
  });

  it('refuses the page to another host name, so another site cannot read the token', async () => {
    const response = await setUp(builtPage()).request('/', {
      headers: { host: 'evil.example.test' },
    });
    expect(response.status).toBe(403);
  });

  it('says how to build the page when it is missing', async () => {
    const response = await setUp().request('/', { headers: HOST });
    expect(response.status).toBe(404);
    expect(await response.text()).toMatch(/npm run build/);
  });
});
