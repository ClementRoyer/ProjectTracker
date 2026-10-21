import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { projectDocuments } from '../src/documents';

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});

describe('reference documents on disk (ADR 0040)', () => {
  it('finds the files the patterns name, and reads only those', () => {
    const root = mkdtempSync(join(tmpdir(), 'tracker-docs-'));
    folders.push(root);
    mkdirSync(join(root, 'docs'));
    writeFileSync(join(root, 'README.md'), '# Shop');
    writeFileSync(join(root, 'docs', 'api.md'), 'Routes');
    writeFileSync(join(root, 'secret.env'), 'TOKEN=x');
    const documents = projectDocuments(root, ['README.md', 'docs/**/*.md']);
    expect(documents.list()).toEqual(['README.md', 'docs/api.md']);
    expect(documents.read('docs/api.md')).toBe('Routes');
    expect(documents.read('secret.env')).toBeNull();
    expect(documents.read('../outside.md')).toBeNull();
  });
});
