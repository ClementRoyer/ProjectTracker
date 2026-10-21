import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildSync } from 'esbuild';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runExecution, type ExecutionSettings } from '../src/execute';
import { holdFile } from '../src/locks';

let root = '';
let holdScript = '';
const FAKE = join(import.meta.dirname, 'fake-agent.mjs');

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'tracker-execute-'));
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
afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const settings = (mode: string, maxSeconds = 30): ExecutionSettings => {
  const folder = mkdtempSync(join(root, 'run-'));
  const mirror = join(folder, 'mirror');
  mkdirSync(join(mirror, 'api'), { recursive: true });
  writeFileSync(join(mirror, 'api/orders.js'), 'export {};\n');
  return {
    mirror,
    locksDir: join(folder, 'locks'),
    runsDir: join(folder, 'runs'),
    command: [process.execPath, FAKE],
    maxSeconds,
    holdScript,
    schema: '{}',
    env: { FAKE_MODE: mode },
  };
};

const job = { requestId: 'r1', executionId: 'e1', key: 'LOC-1', prompt: 'Add an export route.' };

describe('one back-end execution (ADR 0010)', () => {
  it('passes the launch text on the standard input, never on the command line', async () => {
    const result = await runExecution(job, settings('prose'), () => false);
    expect(result.raw).toMatch(/Lu : Add an export route\./);
  });

  it('reads the structured reply and measures the changed files itself', async () => {
    const run = settings('edit');
    const result = await runExecution(job, run, () => false);
    expect(result).toMatchObject({
      executionId: 'e1',
      reply: { status: 'done', message: 'Route added.' },
      changedFiles: ['api/orders.js'],
      undeclared: [],
    });
    expect(readFileSync(join(run.mirror, 'api/orders.js'), 'utf8')).toMatch(/export route/);
  });

  it('flags a change made without holding the file', async () => {
    const result = await runExecution(job, settings('sneaky'), () => false);
    expect(result.undeclared).toEqual(['api/orders.js']);
  });

  it('says the author is uncertain when another execution ran at the same time', async () => {
    const result = await runExecution(job, settings('sneaky'), () => true);
    expect(result.uncertainAuthor).toBe(true);
  });

  it('reports the file held by another ticket, so that the request waits for it', async () => {
    const run = settings('refused');
    holdFile(run.locksDir, 'api/orders.js', { key: 'LOC-9', executionId: 'other' });
    const result = await runExecution(job, run, () => false);
    expect(result.blockedOn).toEqual({ path: 'api/orders.js', heldBy: 'LOC-9' });
  });

  it('keeps an output that is not JSON as it is', async () => {
    const result = await runExecution(job, settings('prose'), () => false);
    expect(result.reply).toBeUndefined();
    expect(result.raw).toMatch(/Fini, sans JSON/);
  });

  it('reads the envelope of claude -p and its measured usage', async () => {
    const result = await runExecution(job, settings('claude'), () => false);
    expect(result.reply?.message).toBe('Route added.');
    expect(result.usage).toEqual([
      {
        model: 'model-a',
        inputTokens: 10,
        outputTokens: 500,
        cacheReadTokens: 9000,
        cacheWriteTokens: 300,
      },
    ]);
  });

  it('stops an agent that runs past the time limit, and frees its holds', async () => {
    const result = await runExecution(job, settings('slow', 1), () => false);
    expect(result.failure).toMatch(/1 s/);
  });
});
