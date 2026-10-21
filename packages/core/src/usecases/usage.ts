import type * as op from '@project-tracker/contract';
import { estimateCost, ok, periodKey, summarizeUsage, type Result } from '../domain';
import { activeAssignmentsOfAgent, allTickets, insertUsage, listUsage } from '../store';
import {
  loadTicket,
  type InputOf,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';

/** Usage measured by an adapter or declared by an agent (ADR 0012), on the ticket the conversation holds. */
export function recordUsage(
  ctx: UsecaseContext,
  input: InputOf<typeof op.recordUsage>,
): Result<OutputOf<typeof op.recordUsage>, UsecaseError> {
  const ticketId = ticketOf(ctx, input.key);
  if (!ticketId.ok) return ticketId;
  const at = ctx.now();
  const sessionId = ctx.actor.kind === 'agent' ? ctx.actor.sessionId : undefined;
  for (const line of input.usage) {
    insertUsage(ctx.db, {
      id: ctx.newId(),
      ...line,
      provenance: input.provenance,
      at,
      ...(ticketId.value ? { ticketId: ticketId.value } : {}),
      ...(sessionId ? { sessionId } : {}),
    });
  }
  return ok({ recorded: input.usage.length });
}

/** Tokens and estimated cost by period, in the developer's time zone (ADR 0022), and by ticket (F20). */
export function usageSummary(
  ctx: UsecaseContext,
  input: InputOf<typeof op.usageSummary>,
): Result<OutputOf<typeof op.usageSummary>, UsecaseError> {
  const prices = ctx.prices ?? {};
  const usage = listUsage(ctx.db);
  const timeZone = ctx.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const keys = new Map(allTickets(ctx.db).map((ticket) => [ticket.id, ticket.key]));
  const byTicket = new Map<string | null, { tokens: number; estimatedCost: number }>();
  for (const line of usage) {
    const key = line.ticketId ? (keys.get(line.ticketId) ?? null) : null;
    const total = byTicket.get(key) ?? { tokens: 0, estimatedCost: 0 };
    total.tokens +=
      line.inputTokens + line.outputTokens + line.cacheReadTokens + line.cacheWriteTokens;
    total.estimatedCost += estimateCost(line, prices) ?? 0;
    byTicket.set(key, total);
  }
  return ok({
    current: periodKey(ctx.now(), input.period, timeZone),
    currency: ctx.currency ?? null,
    periods: summarizeUsage(usage, prices, input.period, timeZone),
    byTicket: [...byTicket]
      .map(([key, total]) => ({ key, ...total }))
      .sort((a, b) => b.tokens - a.tokens),
  });
}

function ticketOf(
  ctx: UsecaseContext,
  key: string | undefined,
): Result<string | null, UsecaseError> {
  if (key !== undefined) {
    const loaded = loadTicket(ctx, key);
    return loaded.ok ? ok(loaded.value.ticket.id) : loaded;
  }
  if (ctx.actor.kind !== 'agent') return ok(null);
  const held = [
    ...new Set(activeAssignmentsOfAgent(ctx.db, ctx.actor.agentId).map((a) => a.ticketId)),
  ];
  return ok(held.length === 1 ? (held[0] ?? null) : null);
}
