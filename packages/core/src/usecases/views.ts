import type {
  EntryView,
  QuestionDetails,
  SituationView,
  TicketSummary,
} from '@project-tracker/contract';
import {
  isReadyToClose,
  isStale,
  isWorking,
  type Entry,
  type Phase,
  type Progress,
  type Ticket,
} from '../domain';
import {
  activeAssignees,
  groupNames,
  hasEntriesFromOthersSince,
  lastActivityAt,
  lastAgentEntry,
  latestWorkSignal,
  readTicketReadAt,
  ticketsWithRunningExecution,
  type OpenQuestion,
  type SituationRecord,
} from '../store';
import type { UsecaseContext } from './context';
import { overlappingKeys } from './overlaps';

export const PHASE_LABELS: Readonly<Record<Phase, string>> = {
  todo: 'À faire',
  analysis: 'Analyse',
  development: 'Développement',
  test: 'Test',
  qaDelivery: 'Livraison en qualité',
  qaValidation: 'Validation en qualité',
};

export function describeProgress(progress: Progress): string {
  switch (progress.state) {
    case 'notStarted':
      return 'Avancement : pas démarré';
    case 'inProgress':
      return `Avancement : en cours, ${progress.note}`;
    case 'done':
      return 'Avancement : fait';
  }
}

export function toSituationView(record: SituationRecord): SituationView {
  return {
    phase: record.situation.phase,
    progress: record.situation.progress,
    wait: record.wait,
    closedAt: record.situation.closedAt ?? null,
  };
}

/** Names of the agents by conversation, and when each delivered entry was taken into account. */
export interface EntryContext {
  authors: ReadonlyMap<string, string>;
  acknowledged: ReadonlyMap<string, string>;
}

export function toEntryView(entry: Entry, context: EntryContext): EntryView {
  return {
    id: entry.id,
    entryType: entry.entryType,
    authorKind: entry.authorKind,
    author: entry.sessionId === undefined ? null : (context.authors.get(entry.sessionId) ?? null),
    role: entry.role ?? null,
    body: entry.body,
    data: entry.data ?? null,
    replyTo: entry.replyTo ?? null,
    acknowledgedAt: context.acknowledged.get(entry.id) ?? null,
    createdAt: entry.createdAt,
  };
}

/** A signalled start is forgotten after this silence: the agent may have stopped without saying (ADR 0028). */
const SIGNALLED_WORK_TIMEOUT_MS = 3_600_000;

/** A ticket as the list shows it: situation, last activity, « sans nouvelles », unread, who acts. */
export function toSummary(
  ctx: UsecaseContext,
  ticket: Ticket,
  record: SituationRecord,
): TicketSummary {
  const lastActivity = lastActivityAt(ctx.db, ticket.id) ?? ticket.createdAt;
  return {
    key: ticket.key,
    title: ticket.title,
    origin: ticket.origin,
    priority: ticket.priority,
    dueDate: ticket.dueDate ?? null,
    group: ticket.groupId === undefined ? null : (groupNames(ctx.db).get(ticket.groupId) ?? null),
    size: ticket.size ?? null,
    jiraStatus: ticket.jiraStatus ?? null,
    situation: toSituationView(record),
    lastActivityAt: lastActivity,
    stale: isStale(record.situation, {
      lastActivityAt: lastActivity,
      now: ctx.now(),
      thresholdMs: ctx.staleAfterMs,
    }),
    unread: hasEntriesFromOthersSince(ctx.db, ticket.id, readTicketReadAt(ctx.db, ticket.id)),
    overlaps: record.situation.closedAt === undefined ? overlappingKeys(ctx, ticket.id) : [],
    assignees: activeAssignees(ctx.db, ticket.id).map(({ role, agentName }) => ({
      role,
      kind: agentName === null ? 'developer' : 'agent',
      name: agentName,
    })),
    working: record.situation.closedAt === undefined && isAgentWorking(ctx, ticket.id),
    readyToClose: isReadyToClose(record.situation),
  };
}

function isAgentWorking(ctx: UsecaseContext, ticketId: string): boolean {
  return isWorking({
    signal: latestWorkSignal(ctx.db, ticketId),
    lastAgentEntry: lastAgentEntry(ctx.db, ticketId),
    executionRunning: ticketsWithRunningExecution(ctx.db).has(ticketId),
    now: ctx.now(),
    deducedTimeoutMs: ctx.workingTimeoutMs,
    signalledTimeoutMs: SIGNALLED_WORK_TIMEOUT_MS,
  });
}

export function toQuestionDetails(
  question: OpenQuestion,
  authors: ReadonlyMap<string, string>,
): QuestionDetails {
  return {
    context: question.context,
    options: question.options,
    recommendation: question.recommendation,
    author: question.sessionId === null ? null : (authors.get(question.sessionId) ?? null),
    role: question.role,
  };
}
