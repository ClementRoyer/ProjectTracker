import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { heldFiles, holdFile, lastRefusal, releaseExecution } from '../src/locks';
import { changedSince, snapshot } from '../src/mirror';

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});
const folder = (): string => {
  const path = mkdtempSync(join(tmpdir(), 'tracker-launcher-'));
  folders.push(path);
  return path;
};

describe('file holds in the mirror (ADR 0010)', () => {
  it('gives a file to the first execution that holds it, and names it to the next one', () => {
    const locks = folder();
    expect(holdFile(locks, 'api/orders.js', { key: 'LOC-1', executionId: 'e1' })).toEqual({
      ok: true,
    });
    expect(holdFile(locks, 'api/orders.js', { key: 'LOC-2', executionId: 'e2' })).toEqual({
      ok: false,
      heldBy: 'LOC-1',
    });
    expect(lastRefusal(locks, 'e2')).toEqual({ path: 'api/orders.js', heldBy: 'LOC-1' });
  });

  it('lets an execution hold again a file it already holds', () => {
    const locks = folder();
    holdFile(locks, 'api/orders.js', { key: 'LOC-1', executionId: 'e1' });
    expect(holdFile(locks, 'api/orders.js', { key: 'LOC-1', executionId: 'e1' })).toEqual({
      ok: true,
    });
  });

  it('frees every file of an execution when it ends', () => {
    const locks = folder();
    holdFile(locks, 'api/orders.js', { key: 'LOC-1', executionId: 'e1' });
    holdFile(locks, 'api/users.js', { key: 'LOC-1', executionId: 'e1' });
    holdFile(locks, 'api/export.js', { key: 'LOC-2', executionId: 'e2' });
    releaseExecution(locks, 'e1');
    expect(heldFiles(locks).map((hold) => hold.path)).toEqual(['api/export.js']);
  });

  it('refuses a path that leaves the mirror', () => {
    expect(() => holdFile(folder(), '../outside.js', { key: 'LOC-1', executionId: 'e1' })).toThrow(
      /outside the mirror/i,
    );
  });
});

describe('mirror guard', () => {
  it('finds the files changed, added and removed during an execution', () => {
    const mirror = folder();
    mkdirSync(join(mirror, 'api'));
    writeFileSync(join(mirror, 'api/orders.js'), 'a');
    writeFileSync(join(mirror, 'api/old.js'), 'a');
    const before = snapshot(mirror);
    writeFileSync(join(mirror, 'api/orders.js'), 'b');
    writeFileSync(join(mirror, 'api/new.js'), 'c');
    rmSync(join(mirror, 'api/old.js'));
    expect(changedSince(before, snapshot(mirror))).toEqual([
      'api/new.js',
      'api/old.js',
      'api/orders.js',
    ]);
  });
});
