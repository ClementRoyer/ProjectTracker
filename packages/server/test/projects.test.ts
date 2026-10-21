import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '@project-tracker/core/store';
import { createApp } from '../src/app';
import { parseConfig } from '../src/config';

const DEVELOPER = 'developer-token-for-tests';
const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

describe('the project menu (ADR 0039)', () => {
  it('lists this project, and leaves out the ones whose tracker does not answer', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'tracker-projects-'));
    folders.push(folder);
    const registryFile = join(folder, 'projects.json');
    writeFileSync(
      registryFile,
      JSON.stringify([
        { name: 'shop', url: 'http://127.0.0.1:9620', root: '/work/shop' },
        { name: 'blog', url: 'http://127.0.0.1:9618', root: '/work/blog' },
      ]),
    );
    const config = parseConfig({});
    if (!config.ok) throw new Error(config.error);
    const app = createApp({
      db: openDatabase(':memory:'),
      config: config.value,
      developerToken: DEVELOPER,
      registryFile,
    });
    const response = await app.request('/api/projects', {
      headers: { host: '127.0.0.1:9620', authorization: `Bearer ${DEVELOPER}` },
    });
    expect(await response.json()).toEqual({
      projects: [{ name: 'shop', url: 'http://127.0.0.1:9620', current: true }],
    });
  });
});
