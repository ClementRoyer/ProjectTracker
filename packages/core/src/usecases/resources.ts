import type * as op from '@project-tracker/contract';
import { fail, ok, type Result } from '../domain';
import {
  allTickets,
  appendEntry,
  deleteResourceLock,
  enqueueForResource,
  ensureResource,
  inTransaction,
  leaveResourceQueue,
  readResourceLock,
  resourceQueue,
  saveResourceLock,
} from '../store';
import {
  authorOf,
  loadTicket,
  type InputOf,
  type LoadedTicket,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';
import { refreshWait } from './situation';

const DEFAULT_LEASE_MS = 60_000;

type Request = { key: string; resource: string };

/** Takes the resource for the ticket, or queues it: one ticket at a time (ADR 0008, 0034). */
export function acquireResource(
  ctx: UsecaseContext,
  input: InputOf<typeof op.acquireResource>,
): Result<OutputOf<typeof op.acquireResource>, UsecaseError> {
  const checked = check(ctx, input);
  if (!checked.ok) return checked;
  const { ticket } = checked.value;
  return inTransaction(ctx.db, () => {
    const at = ctx.now();
    ensureResource(ctx.db, input.resource);
    expire(ctx, input.resource, at);
    const lock = readResourceLock(ctx.db, input.resource);
    if (lock === null || lock.ticketId === ticket.id) {
      const leaseUntil =
        lock === null
          ? give(ctx, input.resource, ticket.id, at)
          : renew(ctx, input.resource, ticket.id, at);
      refreshWait(ctx, checked.value, at);
      return ok({ granted: true, leaseUntil, heldBy: null, position: 0 });
    }
    enqueueForResource(ctx.db, input.resource, ticket.id, at);
    refreshWait(ctx, checked.value, at);
    const position = resourceQueue(ctx.db, input.resource).indexOf(ticket.id) + 1;
    return ok({ granted: false, leaseUntil: null, heldBy: keyOf(ctx, lock.ticketId), position });
  });
}

/** Keeps the lock while the command runs; a lock not renewed in time is lost. */
export function renewResource(
  ctx: UsecaseContext,
  input: InputOf<typeof op.renewResource>,
): Result<OutputOf<typeof op.renewResource>, UsecaseError> {
  const checked = check(ctx, input);
  if (!checked.ok) return checked;
  const at = ctx.now();
  expire(ctx, input.resource, at);
  if (readResourceLock(ctx.db, input.resource)?.ticketId !== checked.value.ticket.id) {
    return fail('notResourceHolder');
  }
  return ok({ leaseUntil: renew(ctx, input.resource, checked.value.ticket.id, at) });
}

/** Gives the resource back, or leaves its queue; the next ticket in the queue gets it. */
export function releaseResource(
  ctx: UsecaseContext,
  input: InputOf<typeof op.releaseResource>,
): Result<OutputOf<typeof op.releaseResource>, UsecaseError> {
  const checked = check(ctx, input);
  if (!checked.ok) return checked;
  const { ticket } = checked.value;
  inTransaction(ctx.db, () => {
    const at = ctx.now();
    leaveResourceQueue(ctx.db, input.resource, ticket.id);
    if (readResourceLock(ctx.db, input.resource)?.ticketId === ticket.id) {
      note(ctx, ticket.id, `Resource "${input.resource}" released`, at);
      handOver(ctx, input.resource, at);
    }
    refreshWait(ctx, checked.value, at);
  });
  return ok({ released: true });
}

function check(ctx: UsecaseContext, input: Request): Result<LoadedTicket, UsecaseError> {
  if (!(ctx.resources ?? []).includes(input.resource)) return fail('unknownResource');
  return loadTicket(ctx, input.key);
}

/** A lock whose lease ran out goes to the next in the queue. */
function expire(ctx: UsecaseContext, resource: string, at: string): void {
  const lock = readResourceLock(ctx.db, resource);
  if (lock === null || lock.leaseUntil > at) return;
  note(ctx, lock.ticketId, `Resource "${resource}" released: lease expired, no news`, at);
  handOver(ctx, resource, at);
}

/** The lock goes to the first ticket of the queue, which must renew it in time, or nobody. */
function handOver(ctx: UsecaseContext, resource: string, at: string): void {
  deleteResourceLock(ctx.db, resource);
  const [next] = resourceQueue(ctx.db, resource);
  if (next === undefined) return;
  give(ctx, resource, next, at);
  const key = keyOf(ctx, next);
  const loaded = key === null ? null : loadTicket(ctx, key);
  if (loaded?.ok === true) refreshWait(ctx, loaded.value, at);
}

function give(ctx: UsecaseContext, resource: string, ticketId: string, at: string): string {
  leaveResourceQueue(ctx.db, resource, ticketId);
  note(ctx, ticketId, `Resource "${resource}" taken`, at);
  return renew(ctx, resource, ticketId, at);
}

function renew(ctx: UsecaseContext, resource: string, ticketId: string, at: string): string {
  const leaseUntil = new Date(
    Date.parse(at) + (ctx.resourceLeaseMs ?? DEFAULT_LEASE_MS),
  ).toISOString();
  const sessionId = ctx.actor.kind === 'agent' ? (ctx.actor.sessionId ?? null) : null;
  saveResourceLock(ctx.db, { resource, ticketId, sessionId, leaseUntil });
  return leaseUntil;
}

function note(ctx: UsecaseContext, ticketId: string, body: string, at: string): void {
  appendEntry(ctx.db, {
    id: ctx.newId(),
    ticketId,
    entryType: 'situationChange',
    ...authorOf(ctx.actor),
    body,
    createdAt: at,
  });
}

function keyOf(ctx: UsecaseContext, ticketId: string): string | null {
  return allTickets(ctx.db).find((ticket) => ticket.id === ticketId)?.key ?? null;
}
