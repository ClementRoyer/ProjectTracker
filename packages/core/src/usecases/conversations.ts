import { createHash, randomBytes } from 'node:crypto';
import type * as op from '@project-tracker/contract';
import { assign, fail, ok, type Actor, type Assignee, type Result } from '../domain';
import {
  activeAssignments,
  allTickets,
  findOrCreateAgent,
  findSessionByTokenHash,
  insertSession,
  saveAssignment,
  saveWorkSignal,
} from '../store';
import {
  loadTicket,
  type InputOf,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';

const hashToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/** A new conversation of an agent; only the hash of its token is kept (ADR 0015). */
export function introduce(
  ctx: UsecaseContext,
  input: InputOf<typeof op.introduce>,
): Result<OutputOf<typeof op.introduce>, UsecaseError> {
  const token = randomBytes(24).toString('base64url');
  const agentId = findOrCreateAgent(ctx.db, {
    id: ctx.newId(),
    name: input.name,
    tool: input.tool ?? null,
  });
  insertSession(ctx.db, {
    id: ctx.newId(),
    agentId,
    tokenHash: hashToken(token),
    startedAt: ctx.now(),
  });
  return ok({ token, agentName: input.name });
}

/** The conversation behind a token, or null for an unknown or ended one. */
export function identify(ctx: UsecaseContext, token: string): Actor | null {
  const session = findSessionByTokenHash(ctx.db, hashToken(token));
  return session ? { kind: 'agent', agentId: session.agentId, sessionId: session.sessionId } : null;
}

/** One assignee per role (ADR 0010); the same agent may take its role back from a new conversation. */
export function takeTicket(
  ctx: UsecaseContext,
  input: InputOf<typeof op.takeTicket>,
): Result<OutputOf<typeof op.takeTicket>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const ticketId = loaded.value.ticket.id;
  const active = activeAssignments(ctx.db, ticketId).map((a) => ({
    ticketId: a.ticketId,
    role: a.role,
    assignee: toAssignee(a.agentId),
  }));
  const wanted = {
    ticketId,
    role: input.role,
    assignee: toAssignee(ctx.actor.kind === 'agent' ? ctx.actor.agentId : null),
  };
  const taken = assign(active, wanted);
  if (!taken.ok) return fail('roleTaken');
  saveAssignment(
    ctx.db,
    {
      ticketId,
      role: input.role,
      agentId: ctx.actor.kind === 'agent' ? ctx.actor.agentId : null,
      sessionId: ctx.actor.kind === 'agent' ? (ctx.actor.sessionId ?? null) : null,
    },
    ctx.now(),
  );
  return ok({ key: input.key, role: input.role });
}

/** The agent says it starts or stops working (ADR 0028); without a key, on the tickets it holds. */
export function reportWorking(
  ctx: UsecaseContext,
  input: InputOf<typeof op.reportWorking>,
): Result<OutputOf<typeof op.reportWorking>, UsecaseError> {
  if (ctx.actor.kind !== 'agent') return ok({ keys: [] });
  let ticketId: string | null = null;
  if (input.key !== undefined) {
    const loaded = loadTicket(ctx, input.key);
    if (!loaded.ok) return loaded;
    ticketId = loaded.value.ticket.id;
  }
  const signal = { state: input.working ? 'started' : 'finished', at: ctx.now() } as const;
  const ticketIds = new Set(saveWorkSignal(ctx.db, ctx.actor.agentId, signal, ticketId));
  const keys = allTickets(ctx.db)
    .filter((ticket) => ticketIds.has(ticket.id))
    .map((ticket) => ticket.key);
  return ok({ keys });
}

function toAssignee(agentId: string | null): Assignee {
  return agentId === null ? { kind: 'developer' } : { kind: 'agent', agentId };
}
