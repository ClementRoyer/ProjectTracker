import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { readRegistry, registerProject, unregisterProject } from '../../src/project/registry';

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});
const registry = (): string => {
  const folder = mkdtempSync(join(tmpdir(), 'tracker-registry-'));
  folders.push(folder);
  return join(folder, 'projects.json');
};

describe('the projects of the machine (ADR 0039)', () => {
  it('notes a project once, by its root, with the address of its tracker', () => {
    const file = registry();
    registerProject(file, '/work/shop', 'http://127.0.0.1:9620');
    registerProject(file, '/work/shop', 'http://127.0.0.1:9630');
    registerProject(file, '/work/blog', 'http://127.0.0.1:9640');
    expect(readRegistry(file)).toEqual([
      { name: 'shop', url: 'http://127.0.0.1:9630', root: '/work/shop' },
      { name: 'blog', url: 'http://127.0.0.1:9640', root: '/work/blog' },
    ]);
  });

  it('takes a project out', () => {
    const file = registry();
    registerProject(file, '/work/shop', 'http://127.0.0.1:9620');
    unregisterProject(file, '/work/shop');
    expect(readRegistry(file)).toEqual([]);
  });
});
