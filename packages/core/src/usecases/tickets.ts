import type * as op from '@project-tracker/contract';
import { DEFAULT_PRIORITY, fail, newSituation, ok, type Result, type Ticket } from '../domain';
import {
  acknowledgements,
  agentNamesBySession,
  allTickets,
  appendEntry,
  inTransaction,
  insertTicket,
  lastLocalKeyNumber,
  listEntries,
  openQuestions,
  readSituation,
  readWorktree,
  savePriority,
  saveSituation,
} from '../store';
import {
  authorOf,
  loadTicket,
  type InputOf,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';
import { ticketAttachments } from './attachments';
import { changelogOf } from './changelog';
import { changedFilesOf } from './overlaps';
import { previewOf } from './preview';
import { toEntryView, toQuestionDetails, toSummary } from './views';

/** A local ticket stays local: its key is LOC-n and it never goes to Jira. */
export function createTicket(
  ctx: UsecaseContext,
  input: InputOf<typeof op.createTicket>,
): Result<OutputOf<typeof op.createTicket>, UsecaseError> {
  const title = input.title.trim();
  if (title === '') return fail('emptyTitle');
  const at = ctx.now();
  const ticket: Ticket = {
    id: ctx.newId(),
    key: `LOC-${String(lastLocalKeyNumber(ctx.db) + 1)}`,
    origin: 'local',
    title,
    priority: DEFAULT_PRIORITY,
    createdAt: at,
  };
  const request = input.initialRequest?.trim();
  if (request) ticket.initialRequest = request;
  inTransaction(ctx.db, () => {
    insertTicket(ctx.db, ticket);
    saveSituation(ctx.db, {
      ticketId: ticket.id,
      situation: newSituation(),
      wait: null,
      updatedAt: at,
    });
    appendEntry(ctx.db, {
      id: ctx.newId(),
      ticketId: ticket.id,
      entryType: 'situationChange',
      ...authorOf(ctx.actor),
      body: `Ticket créé : ${title}`,
      createdAt: at,
    });
  });
  return ok({ key: ticket.key });
}

const PRIORITY_LABELS = {
  urgent: 'urgente',
  high: 'haute',
  normal: 'normale',
  low: 'basse',
} as const;

/** The developer sets the priority (ADR 0032); a real change is noted in the journal. */
export function setPriority(
  ctx: UsecaseContext,
  input: InputOf<typeof op.setPriority>,
): Result<OutputOf<typeof op.setPriority>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const { ticket } = loaded.value;
  if (ticket.priority === input.priority) return ok({ priority: input.priority });
  inTransaction(ctx.db, () => {
    savePriority(ctx.db, ticket.id, input.priority);
    appendEntry(ctx.db, {
      id: ctx.newId(),
      ticketId: ticket.id,
      entryType: 'situationChange',
      ...authorOf(ctx.actor),
      body: `Priorité : ${PRIORITY_LABELS[ticket.priority]} → ${PRIORITY_LABELS[input.priority]}`,
      data: { priority: { from: ticket.priority, to: input.priority } },
      createdAt: ctx.now(),
    });
  });
  return ok({ priority: input.priority });
}

export function listTickets(
  ctx: UsecaseContext,
  input: InputOf<typeof op.listTickets>,
): Result<OutputOf<typeof op.listTickets>, UsecaseError> {
  const tickets = allTickets(ctx.db).flatMap((ticket) => {
    const record = readSituation(ctx.db, ticket.id);
    if (!record) return [];
    if (record.situation.closedAt !== undefined && input.includeClosed !== true) return [];
    return [toSummary(ctx, ticket, record)];
  });
  return ok({ tickets });
}

export function getTicket(
  ctx: UsecaseContext,
  input: InputOf<typeof op.getTicket>,
): Result<OutputOf<typeof op.getTicket>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const { ticket, record } = loaded.value;
  const authors = agentNamesBySession(ctx.db);
  const acknowledged = acknowledgements(ctx.db, ticket.id);
  return ok({
    ...toSummary(ctx, ticket, record),
    initialRequest: ticket.initialRequest ?? null,
    jiraUrl: ticket.jiraUrl ?? null,
    entries: listEntries(ctx.db, ticket.id).map((entry) =>
      toEntryView(entry, { authors, acknowledged }),
    ),
    openQuestions: openQuestions(ctx.db, ticket.id).map((question) => ({
      questionId: question.entryId,
      text: question.body,
      askedAt: question.createdAt,
      ...toQuestionDetails(question, authors),
    })),
    attachments: ticketAttachments(ctx, ticket.id),
    changelog: changelogOf(ctx, ticket.id),
    changedFiles: changedFilesOf(ctx, ticket.id),
    worktree: readWorktree(ctx.db, ticket.id),
    preview: previewOf(ctx, ticket.key),
  });
}
