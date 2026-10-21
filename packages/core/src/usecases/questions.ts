import type * as op from '@project-tracker/contract';
import type { InboxItemView } from '@project-tracker/contract';
import { fail, ok, type Result, type Role } from '../domain';
import {
  activeAssignments,
  allTickets,
  appendEntry,
  findQuestion,
  inTransaction,
  insertDelivery,
  insertQuestion,
  markAcknowledged,
  markDelivered,
  markQuestionAnswered,
  pendingDeliveries,
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
import { attachmentRefs, checkAttachments } from './attachments';
import { addRequest } from './backend';
import { refreshWait } from './situation';

export function askQuestion(
  ctx: UsecaseContext,
  input: InputOf<typeof op.askQuestion>,
): Result<OutputOf<typeof op.askQuestion>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  if (loaded.value.record.situation.closedAt !== undefined) return fail('ticketClosed');
  const questionId = ctx.newId();
  const at = ctx.now();
  inTransaction(ctx.db, () => {
    appendEntry(ctx.db, {
      id: questionId,
      ticketId: loaded.value.ticket.id,
      entryType: 'question',
      ...authorOf(ctx.actor),
      role: roleOfActor(ctx, loaded.value),
      body: input.text,
      data: {
        context: input.context ?? null,
        options: input.options ?? [],
        recommendation: input.recommendation ?? null,
      },
      createdAt: at,
    });
    insertQuestion(ctx.db, {
      entryId: questionId,
      ticketId: loaded.value.ticket.id,
      options: input.options ?? [],
      ...(input.recommendation === undefined ? {} : { recommendation: input.recommendation }),
      status: 'open',
    });
    refreshWait(ctx, loaded.value, at);
  });
  return ok({ questionId });
}

/** The answer goes to the conversation that asked, or to another one of the same agent (ADR 0007). */
export function answerQuestion(
  ctx: UsecaseContext,
  input: InputOf<typeof op.answerQuestion>,
): Result<OutputOf<typeof op.answerQuestion>, UsecaseError> {
  const question = findQuestion(ctx.db, input.questionId);
  if (!question) return fail('questionNotFound');
  if (question.status !== 'open') return fail('questionAnswered');
  const ticket = allTickets(ctx.db).find((candidate) => candidate.id === question.ticketId);
  if (!ticket) return fail('ticketNotFound');
  const loaded = loadTicket(ctx, ticket.key);
  if (!loaded.ok) return loaded;
  const entryId = ctx.newId();
  const at = ctx.now();
  inTransaction(ctx.db, () => {
    appendEntry(ctx.db, {
      id: entryId,
      ticketId: ticket.id,
      entryType: 'answer',
      ...authorOf(ctx.actor),
      body: input.answer,
      replyTo: input.questionId,
      createdAt: at,
    });
    markQuestionAnswered(ctx.db, input.questionId, entryId);
    if (question.role === 'backend') {
      // The back-end agent that asked is gone: the answer starts a new execution.
      addRequest(ctx, loaded.value, `Developer's answer to "${question.body}": ${input.answer}`);
    } else {
      insertDelivery(ctx.db, {
        entryId,
        ticketId: ticket.id,
        role: question.role,
        sessionId: question.sessionId,
      });
    }
    refreshWait(ctx, loaded.value, at);
  });
  return ok({ entryId });
}

/** A message of the developer for whoever holds the role, now or later (F14, F33). */
export function sendMessage(
  ctx: UsecaseContext,
  input: InputOf<typeof op.sendMessage>,
): Result<OutputOf<typeof op.sendMessage>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const attachments = checkAttachments(ctx, loaded.value.ticket.id, input.attachments);
  if (!attachments.ok) return attachments;
  const entryId = ctx.newId();
  if (input.to === 'backend') {
    // The back-end agent runs elsewhere: it reads the attachments by their address (ADR 0035).
    const refs = attachmentRefs(ctx, { attachments: attachments.value });
    const text = [input.body, ...refs.map((ref) => `Attachment: ${ref.name} (${ref.url})`)];
    inTransaction(ctx.db, () => {
      addRequest(ctx, loaded.value, text.join('\n'), entryId);
    });
    return ok({ entryId });
  }
  inTransaction(ctx.db, () => {
    appendEntry(ctx.db, {
      id: entryId,
      ticketId: loaded.value.ticket.id,
      entryType: 'exchange',
      ...authorOf(ctx.actor),
      role: input.to,
      body: input.body,
      data: {
        to: input.to,
        ...(attachments.value.length > 0 ? { attachments: attachments.value } : {}),
      },
      createdAt: ctx.now(),
    });
    insertDelivery(ctx.db, {
      entryId,
      ticketId: loaded.value.ticket.id,
      role: input.to,
      sessionId: null,
    });
  });
  return ok({ entryId });
}

/** Pull delivery: each item is handed over once, to the calling conversation. */
export function listInbox(
  ctx: UsecaseContext,
  _input: InputOf<typeof op.listInbox>,
): Result<OutputOf<typeof op.listInbox>, UsecaseError> {
  if (ctx.actor.kind !== 'agent' || ctx.actor.sessionId === undefined) return ok({ items: [] });
  const { agentId, sessionId } = ctx.actor;
  const keys = new Map(allTickets(ctx.db).map((ticket) => [ticket.id, ticket.key]));
  const at = ctx.now();
  const items = pendingDeliveries(ctx.db, agentId).map((pending): InboxItemView => {
    markDelivered(ctx.db, pending.entryId, sessionId, at);
    const question = pending.replyTo === null ? null : findQuestion(ctx.db, pending.replyTo);
    return {
      entryId: pending.entryId,
      key: keys.get(pending.ticketId) ?? '',
      kind: pending.entryType === 'answer' ? 'answer' : 'message',
      body: pending.body,
      question: question?.body ?? null,
      attachments: attachmentRefs(ctx, pending.data),
      at: pending.createdAt,
    };
  });
  return ok({ items });
}

export function acknowledge(
  ctx: UsecaseContext,
  input: InputOf<typeof op.acknowledge>,
): Result<OutputOf<typeof op.acknowledge>, UsecaseError> {
  if (ctx.actor.kind !== 'agent') return fail('nothingToAcknowledge');
  const at = ctx.now();
  return markAcknowledged(ctx.db, input.entryId, ctx.actor.agentId, at)
    ? ok({ acknowledgedAt: at })
    : fail('nothingToAcknowledge');
}

function roleOfActor(ctx: UsecaseContext, loaded: LoadedTicket): Role {
  if (ctx.actor.kind !== 'agent') return 'front';
  const agentId = ctx.actor.agentId;
  return (
    activeAssignments(ctx.db, loaded.ticket.id).find((a) => a.agentId === agentId)?.role ?? 'front'
  );
}
