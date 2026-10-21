import type * as op from '@project-tracker/contract';
import type { DeliveryBatchView } from '@project-tracker/contract';
import { fail, ok, type Phase, type Result, type Ticket } from '../domain';
import {
  allTickets,
  inTransaction,
  insertDeliveryBatch,
  listDeliveryBatches,
  markBatchValidated,
  readChangelogLine,
  type StoredDeliveryBatch,
} from '../store';
import {
  loadTicket,
  type InputOf,
  type LoadedTicket,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';
import { writeChange } from './situation';

/** A QA delivery (F19): every ticket of the batch moves to a done QA delivery. */
export function deliverBatch(
  ctx: UsecaseContext,
  input: InputOf<typeof op.deliverBatch>,
): Result<OutputOf<typeof op.deliverBatch>, UsecaseError> {
  const loaded: LoadedTicket[] = [];
  for (const key of input.keys) {
    const ticket = loadTicket(ctx, key);
    if (!ticket.ok) return ticket;
    if (ticket.value.record.situation.closedAt !== undefined) return fail('ticketClosed');
    loaded.push(ticket.value);
  }
  const batch: StoredDeliveryBatch = {
    id: ctx.newId(),
    name: input.name,
    deliveredAt: ctx.now(),
    validatedAt: null,
    ticketIds: loaded.map((ticket) => ticket.ticket.id),
  };
  const at = batch.deliveredAt ?? ctx.now();
  inTransaction(ctx.db, () => {
    insertDeliveryBatch(ctx.db, {
      id: batch.id,
      name: batch.name,
      ticketIds: batch.ticketIds,
      ...(batch.deliveredAt ? { deliveredAt: batch.deliveredAt } : {}),
    });
    for (const ticket of loaded) {
      moveDone(ctx, ticket, 'qaDelivery', `Livré en qualité : ${input.name}`);
    }
  });
  return ok({
    ...toView(batch, allTickets(ctx.db)),
    changelog: addToChangelog(ctx, input.name, at, loaded),
  });
}

/** The accepted lines of the delivered tickets go to the changelog; those without one are named (ADR 0037). */
function addToChangelog(
  ctx: UsecaseContext,
  name: string,
  at: string,
  delivered: LoadedTicket[],
): { written: number; missing: string[] } | null {
  if (!ctx.changelog) return null;
  const lines = delivered.flatMap(({ ticket }) => {
    const { accepted } = readChangelogLine(ctx.db, ticket.id);
    return accepted === null ? [] : [{ key: ticket.key, line: accepted }];
  });
  if (lines.length > 0) ctx.changelog.append({ name, at, lines });
  const written = new Set(lines.map((line) => line.key));
  return {
    written: lines.length,
    missing: delivered.map(({ ticket }) => ticket.key).filter((key) => !written.has(key)),
  };
}

/** The delivery is validated: every ticket moves to a done QA validation, ready to be closed. */
export function validateBatch(
  ctx: UsecaseContext,
  input: InputOf<typeof op.validateBatch>,
): Result<OutputOf<typeof op.validateBatch>, UsecaseError> {
  const batch = listDeliveryBatches(ctx.db).find((candidate) => candidate.id === input.batchId);
  if (!batch) return fail('batchNotFound');
  if (batch.validatedAt !== null) return fail('alreadyValidated');
  const tickets = allTickets(ctx.db);
  const at = ctx.now();
  inTransaction(ctx.db, () => {
    markBatchValidated(ctx.db, batch.id, at);
    for (const ticket of tickets.filter((candidate) => batch.ticketIds.includes(candidate.id))) {
      const loaded = loadTicket(ctx, ticket.key);
      if (loaded.ok) {
        moveDone(ctx, loaded.value, 'qaValidation', `Validé en qualité : ${batch.name}`);
      }
    }
  });
  return ok(toView({ ...batch, validatedAt: at }, tickets));
}

export function listBatches(
  ctx: UsecaseContext,
  _input: InputOf<typeof op.listBatches>,
): Result<OutputOf<typeof op.listBatches>, UsecaseError> {
  const tickets = allTickets(ctx.db);
  return ok({ batches: listDeliveryBatches(ctx.db).map((batch) => toView(batch, tickets)) });
}

function moveDone(ctx: UsecaseContext, ticket: LoadedTicket, phase: Phase, body: string): void {
  const situation = { ...ticket.record.situation, phase, progress: { state: 'done' as const } };
  writeChange(ctx, ticket, { situation, entryType: 'situationChange', body, data: { to: phase } });
}

function toView(batch: StoredDeliveryBatch, tickets: readonly Ticket[]): DeliveryBatchView {
  return {
    id: batch.id,
    name: batch.name,
    deliveredAt: batch.deliveredAt,
    validatedAt: batch.validatedAt,
    keys: batch.ticketIds.flatMap((id) =>
      tickets.filter((ticket) => ticket.id === id).map((ticket) => ticket.key),
    ),
  };
}
