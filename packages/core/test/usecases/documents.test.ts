import { describe, expect, it } from 'vitest';
import { listDocuments, readDocument } from '../../src/usecases';
import { agent, testContext } from './context';

const withDocuments = (): ReturnType<typeof testContext> => {
  const ctx = testContext();
  const files: Record<string, string> = { 'README.md': '# Shop', 'docs/api.md': 'Routes' };
  ctx.documents = {
    list: () => Object.keys(files),
    read: (path) => files[path] ?? null,
  };
  return ctx;
};

describe('reference documents of the project (F31, ADR 0040)', () => {
  it('lists the documents the configuration names', () => {
    const listed = listDocuments(withDocuments(), {});
    expect(listed.ok && listed.value.documents).toEqual([
      { path: 'README.md' },
      { path: 'docs/api.md' },
    ]);
  });

  it('lets an agent read one of them', () => {
    const ctx = withDocuments();
    expect(
      readDocument(
        { ...ctx.as(agent), documents: ctx.documents ?? { list: () => [], read: () => null } },
        { path: 'docs/api.md' },
      ),
    ).toEqual({
      ok: true,
      value: { path: 'docs/api.md', content: 'Routes' },
    });
  });

  it('refuses any file the configuration does not name', () => {
    expect(readDocument(withDocuments(), { path: 'tools/tracker/developer.token' })).toEqual({
      ok: false,
      error: 'documentNotFound',
    });
  });

  it('has no documents when the project names none', () => {
    const listed = listDocuments(testContext(), {});
    expect(listed.ok && listed.value.documents).toEqual([]);
  });
});
