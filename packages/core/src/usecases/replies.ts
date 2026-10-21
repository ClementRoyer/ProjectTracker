import type * as op from '@project-tracker/contract';
import { fail, ok, type Result } from '../domain';
import { activeAssignmentsOfAgent, allTickets, appendEntry } from '../store';
import {
  authorOf,
  loadTicket,
  type InputOf,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';
import { askQuestion } from './questions';

/**
 * The end-of-turn reply of a front agent (ADR 0017, 0020). The ticket comes from the conversation, not
 * from the agent's text; a reply that is not valid JSON is kept as it is.
 */
export function submitReply(
  ctx: UsecaseContext,
  input: InputOf<typeof op.submitReply>,
): Result<OutputOf<typeof op.submitReply>, UsecaseError> {
  const key = input.key === undefined ? heldTicketKey(ctx) : ok(input.key);
  if (!key.ok) return key;
  const loaded = loadTicket(ctx, key.value);
  if (!loaded.ok) return loaded;
  const ticketKey = loaded.value.ticket.key;
  if (input.reply === undefined) {
    if (input.raw === undefined || input.raw.trim() === '') return fail('emptyBody');
    appendEntry(ctx.db, {
      id: ctx.newId(),
      ticketId: loaded.value.ticket.id,
      entryType: 'progress',
      ...authorOf(ctx.actor),
      body: input.raw,
      data: { structured: false },
      createdAt: ctx.now(),
    });
    return ok({ structured: false });
  }
  const { message, question } = input.reply;
  if (question === null) {
    appendEntry(ctx.db, {
      id: ctx.newId(),
      ticketId: loaded.value.ticket.id,
      entryType: 'progress',
      ...authorOf(ctx.actor),
      body: message,
      data: { structured: true },
      createdAt: ctx.now(),
    });
    return ok({ structured: true });
  }
  const asked = askQuestion(ctx, {
    key: ticketKey,
    text: message,
    context: question.context,
    options: question.options,
    recommendation: question.recommendation,
  });
  return asked.ok ? ok({ structured: true }) : asked;
}

/** The only ticket this agent holds; several or none must be named by the caller. */
function heldTicketKey(ctx: UsecaseContext): Result<string, UsecaseError> {
  if (ctx.actor.kind !== 'agent') return fail('noTicket');
  const ticketIds = [
    ...new Set(activeAssignmentsOfAgent(ctx.db, ctx.actor.agentId).map((a) => a.ticketId)),
  ];
  if (ticketIds.length === 0) return fail('noTicket');
  if (ticketIds.length > 1) return fail('ticketAmbiguous');
  const ticket = allTickets(ctx.db).find((candidate) => candidate.id === ticketIds[0]);
  return ticket ? ok(ticket.key) : fail('noTicket');
}
