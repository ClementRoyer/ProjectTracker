import type * as op from '@project-tracker/contract';
import { ok, type Result } from '../domain';
import { appendEntry, deleteWorktree, inTransaction, saveWorktree } from '../store';
import {
  authorOf,
  loadTicket,
  type InputOf,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';

/** The CLI made the ticket's working folder (ADR 0041); the server only records it. */
export function setWorktree(
  ctx: UsecaseContext,
  input: InputOf<typeof op.setWorktree>,
): Result<OutputOf<typeof op.setWorktree>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const ticketId = loaded.value.ticket.id;
  inTransaction(ctx.db, () => {
    saveWorktree(ctx.db, ticketId, { path: input.path, branch: input.branch });
    note(ctx, ticketId, `Working folder: ${input.path} (branch ${input.branch})`);
  });
  return ok({ path: input.path, branch: input.branch });
}

/** The CLI removed the ticket's working folder. */
export function forgetWorktree(
  ctx: UsecaseContext,
  input: InputOf<typeof op.forgetWorktree>,
): Result<OutputOf<typeof op.forgetWorktree>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const ticketId = loaded.value.ticket.id;
  inTransaction(ctx.db, () => {
    deleteWorktree(ctx.db, ticketId);
    note(ctx, ticketId, 'Working folder removed');
  });
  return ok({});
}

function note(ctx: UsecaseContext, ticketId: string, body: string): void {
  appendEntry(ctx.db, {
    id: ctx.newId(),
    ticketId,
    entryType: 'situationChange',
    ...authorOf(ctx.actor),
    body,
    createdAt: ctx.now(),
  });
}
