import type * as op from '@project-tracker/contract';
import { ok, type Result } from '../domain';
import { appendEntry, inTransaction, insertTestRun } from '../store';
import {
  authorOf,
  loadTicket,
  type InputOf,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';

const KIND_LABELS = { auto: 'Automatic', visual: 'Visual', user: 'User' } as const;

/** A test run of the ticket (F17): kept as a run, and told in the journal. */
export function recordTestRun(
  ctx: UsecaseContext,
  input: InputOf<typeof op.recordTestRun>,
): Result<OutputOf<typeof op.recordTestRun>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const entryId = ctx.newId();
  const at = ctx.now();
  const note = input.note?.trim();
  const verdict = `${KIND_LABELS[input.kind]} tests ${input.passed ? 'passed' : 'failed'}`;
  inTransaction(ctx.db, () => {
    insertTestRun(ctx.db, {
      id: ctx.newId(),
      ticketId: loaded.value.ticket.id,
      kind: input.kind,
      result: input.passed ? 'passed' : 'failed',
      ...(note ? { note } : {}),
      at,
    });
    appendEntry(ctx.db, {
      id: entryId,
      ticketId: loaded.value.ticket.id,
      entryType: 'testRun',
      ...authorOf(ctx.actor),
      body: note ? `${verdict}: ${note}` : verdict,
      data: { kind: input.kind, passed: input.passed },
      createdAt: at,
    });
  });
  return ok({ entryId });
}
