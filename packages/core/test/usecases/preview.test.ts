import { describe, expect, it } from 'vitest';
import {
  closeTicket,
  createTicket,
  deliverBatch,
  getPreview,
  getTicket,
  listWorktrees,
  recordPreview,
  setWorktree,
  validateBatch,
} from '../../src/usecases';
import { testContext } from './context';

function threeTicketsWithFolders(): ReturnType<typeof testContext> {
  const ctx = testContext();
  for (const title of ['Search by name', 'Search by city', 'Search by zip']) {
    createTicket(ctx, { title });
  }
  for (const key of ['LOC-1', 'LOC-2']) {
    setWorktree(ctx, { key, path: `.worktrees/${key}`, branch: `ticket/${key}` });
  }
  return ctx;
}

const conflictOf2 = { key: 'LOC-2', files: ['src/search.ts'], with: ['LOC-1'] };

describe('the preview of the open tickets (ADR 0042)', () => {
  it('lists the working folders of the open tickets only', () => {
    const ctx = threeTicketsWithFolders();
    const batch = deliverBatch(ctx, { name: 'Lot', keys: ['LOC-2'] });
    if (!batch.ok) throw new Error(batch.error);
    validateBatch(ctx, { batchId: batch.value.id });
    closeTicket(ctx, { key: 'LOC-2' });
    const listed = listWorktrees(ctx, {});
    expect(listed.ok && listed.value.worktrees).toEqual([
      { key: 'LOC-1', path: '.worktrees/LOC-1', branch: 'ticket/LOC-1' },
    ]);
  });

  it('keeps the last build: when, which tickets went in, which conflicted', () => {
    const ctx = threeTicketsWithFolders();
    expect(getPreview(ctx, {}).ok && getPreview(ctx, {})).toEqual({
      ok: true,
      value: { preview: null },
    });
    recordPreview(ctx, { included: ['LOC-1'], conflicts: [conflictOf2] });
    const preview = getPreview(ctx, {});
    expect(preview.ok && preview.value.preview).toEqual({
      builtAt: expect.any(String) as string,
      included: ['LOC-1'],
      conflicts: [conflictOf2],
    });
  });

  it('tells each ticket whether it is in the preview or in conflict with it', () => {
    const ctx = threeTicketsWithFolders();
    recordPreview(ctx, { included: ['LOC-1'], conflicts: [conflictOf2] });
    const state = (key: string): unknown => {
      const ticket = getTicket(ctx, { key });
      return ticket.ok && ticket.value.preview;
    };
    expect(state('LOC-1')).toEqual({ state: 'included', files: [], with: [] });
    expect(state('LOC-2')).toEqual({
      state: 'conflict',
      files: ['src/search.ts'],
      with: ['LOC-1'],
    });
    expect(state('LOC-3')).toBeNull();
  });

  it('notes a conflict in the journal when it appears or ends, not at each build', () => {
    const ctx = threeTicketsWithFolders();
    const notes = (): string[] => {
      const ticket = getTicket(ctx, { key: 'LOC-2' });
      return ticket.ok
        ? ticket.value.entries.map((entry) => entry.body).filter((body) => body.includes('preview'))
        : [];
    };
    recordPreview(ctx, { included: ['LOC-1'], conflicts: [conflictOf2] });
    recordPreview(ctx, { included: ['LOC-1'], conflicts: [conflictOf2] });
    recordPreview(ctx, { included: ['LOC-1', 'LOC-2'], conflicts: [] });
    expect(notes()).toEqual([
      'Conflict with the preview: src/search.ts (already merged: LOC-1)',
      'No more conflict with the preview',
    ]);
  });
});
