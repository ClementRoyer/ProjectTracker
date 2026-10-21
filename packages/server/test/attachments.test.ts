import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { openDatabase } from '@project-tracker/core/store';
import { createApp } from '../src/app';
import { parseConfig } from '../src/config';

const DEVELOPER = 'developer-token-for-tests';
const HOST = '127.0.0.1:9620';
const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

const setUp = async (): Promise<{ app: ReturnType<typeof createApp>; dataDir: string }> => {
  const dataDir = mkdtempSync(join(tmpdir(), 'tracker-attachments-'));
  folders.push(dataDir);
  const config = parseConfig({});
  if (!config.ok) throw new Error(config.error);
  const app = createApp({
    db: openDatabase(':memory:'),
    config: config.value,
    developerToken: DEVELOPER,
    dataDir,
  });
  await app.request('/api/createTicket', {
    method: 'POST',
    headers: {
      host: HOST,
      authorization: `Bearer ${DEVELOPER}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ title: 'Fix the cut button' }),
  });
  return { app, dataDir };
};

const upload = (
  app: ReturnType<typeof createApp>,
  name: string,
  body: Uint8Array,
  type = 'image/png',
): Promise<Response> =>
  Promise.resolve(
    app.request(`/api/attachments?key=LOC-1&name=${encodeURIComponent(name)}`, {
      method: 'POST',
      headers: { host: HOST, authorization: `Bearer ${DEVELOPER}`, 'content-type': type },
      body,
    }),
  );

describe('attachment routes (ADR 0035)', () => {
  it('keeps the file next to the database, under the ticket, and reads it back', async () => {
    const { app, dataDir } = await setUp();
    const response = await upload(app, 'capture.png', new Uint8Array([1, 2, 3]));
    const view = (await response.json()) as { path: string; url: string; name: string };
    expect(view.name).toBe('capture.png');
    expect(view.path.startsWith(join(dataDir, 'attachments', 'LOC-1'))).toBe(true);
    expect(existsSync(view.path)).toBe(true);
    const read = await app.request(`${view.url}?token=${DEVELOPER}`, { headers: { host: HOST } });
    expect(new Uint8Array(await read.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect(read.headers.get('content-type')).toBe('image/png');
  });

  it('never lets a file name leave the attachments folder', async () => {
    const { app, dataDir } = await setUp();
    const response = await upload(app, '../../escape.sh', new Uint8Array([1]));
    const view = (await response.json()) as { path: string; name: string };
    expect(view.path.startsWith(join(dataDir, 'attachments', 'LOC-1'))).toBe(true);
    expect(view.name).toBe('escape.sh');
  });

  it('refuses a file over 20 MB', async () => {
    const { app } = await setUp();
    const response = await upload(app, 'big.bin', new Uint8Array(20 * 1024 * 1024 + 1));
    expect(response.status).toBe(413);
  });

  it('sends a file that is not a common image as a download, never shown in the page', async () => {
    const { app } = await setUp();
    const response = await upload(
      app,
      'drawing.svg',
      new TextEncoder().encode('<svg/>'),
      'image/svg+xml',
    );
    const view = (await response.json()) as { url: string };
    const read = await app.request(`${view.url}?token=${DEVELOPER}`, { headers: { host: HOST } });
    expect(read.headers.get('content-disposition')).toMatch(/^attachment/);
    expect(read.headers.get('x-content-type-options')).toBe('nosniff');
  });

  it('refuses to read or add an attachment without a valid token', async () => {
    const { app } = await setUp();
    const view = (await (await upload(app, 'a.png', new Uint8Array([1]))).json()) as {
      url: string;
    };
    expect((await app.request(view.url, { headers: { host: HOST } })).status).toBe(401);
    const anonymous = await app.request('/api/attachments?key=LOC-1&name=a.png', {
      method: 'POST',
      headers: { host: HOST },
      body: new Uint8Array([1]),
    });
    expect(anonymous.status).toBe(401);
  });
});
