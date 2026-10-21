import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer, type RunningServer } from '@project-tracker/server';
import { buildSync } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { trackerClient } from '../src/client';
import { startLauncher } from '../src/loop';

const PORT = 9671;
let root = '';
let server: RunningServer | undefined;
let developer = '';
let holdScript = '';

beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'tracker-loop-'));
  mkdirSync(join(root, 'tracker'));
  writeFileSync(
    join(root, 'tracker/tracker.config.json'),
    JSON.stringify({ port: PORT, launcherTokenEnv: 'TEST_LAUNCHER_TOKEN' }),
  );
  process.env.TEST_LAUNCHER_TOKEN = 'launcher-secret';
  server = await startServer(join(root, 'tracker/tracker.config.json'));
  developer = readFileSync(join(root, 'tracker/developer.token'), 'utf8');
  holdScript = join(root, 'hold.mjs');
  buildSync({
    entryPoints: [join(import.meta.dirname, '../src/hold-main.ts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile: holdScript,
    logLevel: 'silent',
  });
});

afterAll(async () => {
  await server?.close();
  rmSync(root, { recursive: true, force: true });
});

const asDeveloper = trackerClient({
  url: `http://127.0.0.1:${String(PORT)}`,
  get token() {
    return developer;
  },
});

describe('the launcher against the tracker (ADR 0010)', () => {
  it('takes a back-end request, runs the agent in the mirror and brings its reply to the ticket', async () => {
    const mirror = join(root, 'mirror');
    mkdirSync(join(mirror, 'api'), { recursive: true });
    writeFileSync(join(mirror, 'api/orders.js'), 'export {};\n');
    await asDeveloper('createTicket', { title: 'Export orders as CSV' });
    await asDeveloper('requestBackend', { key: 'LOC-1', text: 'Add an export route.' });
    process.env.FAKE_MODE = 'edit';
    const launcher = startLauncher(
      {
        tracker: `http://127.0.0.1:${String(PORT)}`,
        name: 'backend-server',
        tokenEnv: 'TEST_LAUNCHER_TOKEN',
        mirror,
        workFolder: join(root, 'work'),
        maxParallel: 2,
        maxSeconds: 30,
        command: [process.execPath, join(import.meta.dirname, 'fake-agent.mjs')],
      },
      {
        call: trackerClient({ url: `http://127.0.0.1:${String(PORT)}`, token: 'launcher-secret' }),
        holdScript,
        log: () => undefined,
      },
    );
    let body = '';
    for (let attempt = 0; attempt < 50 && !body.includes('Route added.'); attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 200));
      body = JSON.stringify(await asDeveloper('getTicket', { key: 'LOC-1' }));
    }
    await launcher.stop();
    expect(body).toMatch(/Route added\./);
    expect(body).toMatch(/"changedFiles":\["api\/orders\.js"\]/);
    expect(body).toMatch(/"wait":null/);
  });
});
