import type * as op from '@project-tracker/contract';
import { ok, type Result } from '../domain';
import {
  allTickets,
  appendEntry,
  inTransaction,
  readPreview,
  savePreview,
  worktreesOfOpenTickets,
  type PreviewConflict,
} from '../store';
import type { InputOf, OutputOf, UsecaseContext, UsecaseError } from './context';

const byKey = (a: { key: string }, b: { key: string }): number =>
  a.key.localeCompare(b.key, undefined, { numeric: true });

/** The branches the preview merges: the open tickets with a working folder (ADR 0042). */
export function listWorktrees(
  ctx: UsecaseContext,
  _input: InputOf<typeof op.listWorktrees>,
): Result<OutputOf<typeof op.listWorktrees>, UsecaseError> {
  return ok({ worktrees: worktreesOfOpenTickets(ctx.db).sort(byKey) });
}

/** The CLI rebuilt the preview; a ticket's journal notes a conflict when it appears, changes or ends. */
export function recordPreview(
  ctx: UsecaseContext,
  input: InputOf<typeof op.recordPreview>,
): Result<OutputOf<typeof op.recordPreview>, UsecaseError> {
  const before = new Map((readPreview(ctx.db)?.conflicts ?? []).map((c) => [c.key, c]));
  const after = new Map(input.conflicts.map((c) => [c.key, c]));
  const ids = new Map(allTickets(ctx.db).map((ticket) => [ticket.key, ticket.id]));
  const at = ctx.now();
  inTransaction(ctx.db, () => {
    savePreview(ctx.db, { builtAt: at, included: input.included, conflicts: input.conflicts });
    for (const key of new Set([...before.keys(), ...after.keys()])) {
      const body = conflictNote(before.get(key), after.get(key));
      const ticketId = ids.get(key);
      if (body === null || ticketId === undefined) continue;
      appendEntry(ctx.db, {
        id: ctx.newId(),
        ticketId,
        entryType: 'situationChange',
        authorKind: 'system',
        body,
        createdAt: at,
      });
    }
  });
  return ok({ builtAt: at });
}

export function getPreview(
  ctx: UsecaseContext,
  _input: InputOf<typeof op.getPreview>,
): Result<OutputOf<typeof op.getPreview>, UsecaseError> {
  return ok({ preview: readPreview(ctx.db) });
}

/** Where the ticket stands in the last build of the preview; null when it was not part of it. */
export function previewOf(
  ctx: UsecaseContext,
  key: string,
): { state: 'included' | 'conflict'; files: string[]; with: string[] } | null {
  const preview = readPreview(ctx.db);
  if (preview === null) return null;
  const conflict = preview.conflicts.find((c) => c.key === key);
  if (conflict) return { state: 'conflict', files: conflict.files, with: conflict.with };
  return preview.included.includes(key) ? { state: 'included', files: [], with: [] } : null;
}

function conflictNote(
  before: PreviewConflict | undefined,
  after: PreviewConflict | undefined,
): string | null {
  if (after === undefined) return before === undefined ? null : 'No more conflict with the preview';
  if (before !== undefined && before.files.join('\n') === after.files.join('\n')) return null;
  const merged = after.with.length > 0 ? ` (already merged: ${after.with.join(', ')})` : '';
  return `Conflict with the preview: ${after.files.join(', ')}${merged}`;
}
