import type * as op from '@project-tracker/contract';
import type { WaitingItem } from '@project-tracker/contract';
import { fail, isReadyToClose, ok, type Result } from '../domain';
import {
  agentNamesBySession,
  allTickets,
  appendEntry,
  listEntriesSince,
  openQuestions,
  readLastVisit,
  readSituation,
  saveLastVisit,
  saveTicketRead,
} from '../store';
import {
  authorOf,
  loadTicket,
  type InputOf,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';
import { checkAttachments } from './attachments';
import { toEntryView, toQuestionDetails } from './views';

export function recordEntry(
  ctx: UsecaseContext,
  input: InputOf<typeof op.recordEntry>,
): Result<OutputOf<typeof op.recordEntry>, UsecaseError> {
  if (input.body.trim() === '') return fail('emptyBody');
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const attachments = checkAttachments(ctx, loaded.value.ticket.id, input.attachments);
  if (!attachments.ok) return attachments;
  const entryId = ctx.newId();
  appendEntry(ctx.db, {
    id: entryId,
    ticketId: loaded.value.ticket.id,
    entryType: input.entryType,
    ...authorOf(ctx.actor),
    body: input.body,
    ...(attachments.value.length > 0 ? { data: { attachments: attachments.value } } : {}),
    createdAt: ctx.now(),
  });
  return ok({ entryId });
}

/** What changed since the developer's last visit (F9); their own entries are not news to them. */
export function listNovelties(
  ctx: UsecaseContext,
  _input: InputOf<typeof op.listNovelties>,
): Result<OutputOf<typeof op.listNovelties>, UsecaseError> {
  const since = readLastVisit(ctx.db);
  const tickets = new Map(allTickets(ctx.db).map((ticket) => [ticket.id, ticket]));
  const context = { authors: agentNamesBySession(ctx.db), acknowledged: new Map<string, string>() };
  const entries = listEntriesSince(ctx.db, since).flatMap((entry) => {
    const ticket = tickets.get(entry.ticketId);
    if (!ticket || entry.authorKind === 'developer') return [];
    return [{ ...toEntryView(entry, context), key: ticket.key, title: ticket.title }];
  });
  return ok({ since, entries });
}

export function markVisited(
  ctx: UsecaseContext,
  _input: InputOf<typeof op.markVisited>,
): Result<OutputOf<typeof op.markVisited>, UsecaseError> {
  const at = ctx.now();
  saveLastVisit(ctx.db, at);
  return ok({ at });
}

/** The developer read the ticket: its unread mark goes, the others stay (ADR 0029). */
export function markTicketRead(
  ctx: UsecaseContext,
  input: InputOf<typeof op.markTicketRead>,
): Result<OutputOf<typeof op.markTicketRead>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const at = ctx.now();
  saveTicketRead(ctx.db, loaded.value.ticket.id, at);
  return ok({ at });
}

/** Everything that waits for the developer, oldest first (F12). */
export function listWaitingForMe(
  ctx: UsecaseContext,
  _input: InputOf<typeof op.listWaitingForMe>,
): Result<OutputOf<typeof op.listWaitingForMe>, UsecaseError> {
  const tickets = allTickets(ctx.db);
  const byId = new Map(tickets.map((ticket) => [ticket.id, ticket]));
  const authors = agentNamesBySession(ctx.db);
  const questions = openQuestions(ctx.db).flatMap((question): WaitingItem[] => {
    const ticket = byId.get(question.ticketId);
    return ticket
      ? [
          {
            kind: 'question',
            questionId: question.entryId,
            key: ticket.key,
            title: ticket.title,
            since: question.createdAt,
            text: question.body,
            question: toQuestionDetails(question, authors),
          },
        ]
      : [];
  });
  const toClose = tickets.flatMap((ticket): WaitingItem[] => {
    const record = readSituation(ctx.db, ticket.id);
    if (!record || !isReadyToClose(record.situation)) return [];
    return [
      {
        kind: 'close',
        questionId: null,
        key: ticket.key,
        title: ticket.title,
        since: record.updatedAt,
        text: 'QA validation done: to be declared closed',
        question: null,
      },
    ];
  });
  const items = [...questions, ...toClose].sort((a, b) => a.since.localeCompare(b.since));
  return ok({ items });
}
