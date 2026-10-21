import type * as op from '@project-tracker/contract';
import {
  fail,
  newSituation,
  ok,
  priorityFromFiveLevels,
  type JiraIssue,
  type Result,
  type Ticket,
} from '../domain';
import {
  allTickets,
  appendEntry,
  inTransaction,
  insertJiraImport,
  insertTicket,
  knownJiraCommentIds,
  saveDueDate,
  saveSituation,
  updateFromJira,
} from '../store';
import type { InputOf, OutputOf, UsecaseContext, UsecaseError } from './context';

type Output = OutputOf<typeof op.loadFromJira>;

/** Loads the issues assigned to the developer (F2). Read-only towards Jira; the journal keeps every change word for word. */
export async function loadFromJira(
  ctx: UsecaseContext,
  _input: InputOf<typeof op.loadFromJira>,
): Promise<Result<Output, UsecaseError>> {
  if (!ctx.jira) return fail('jiraNotConfigured');
  let issues: JiraIssue[];
  try {
    issues = await ctx.jira();
  } catch {
    return fail('jiraUnreachable');
  }
  const summary: Output = { read: issues.length, created: [], changed: [], notAssigned: [] };
  const tickets = new Map(allTickets(ctx.db).map((ticket) => [ticket.key, ticket]));
  inTransaction(ctx.db, () => {
    for (const issue of issues) {
      const existing = tickets.get(issue.key);
      if (!existing) {
        create(ctx, issue);
        summary.created.push(issue.key);
      } else if (update(ctx, existing, issue)) {
        summary.changed.push(issue.key);
      }
    }
    const assigned = new Set(issues.map((issue) => issue.key));
    summary.notAssigned = [...tickets.values()]
      .filter((ticket) => ticket.origin === 'jira' && !assigned.has(ticket.key))
      .map((ticket) => ticket.key);
    insertJiraImport(ctx.db, { id: ctx.newId(), at: ctx.now(), summary });
  });
  return ok(summary);
}

function create(ctx: UsecaseContext, issue: JiraIssue): void {
  const at = ctx.now();
  const ticket: Ticket = {
    id: ctx.newId(),
    key: issue.key,
    origin: 'jira',
    title: issue.title,
    priority: priorityFromFiveLevels(issue.priority),
    ...(issue.dueDate === undefined ? {} : { dueDate: issue.dueDate }),
    jiraUrl: issue.url,
    jiraStatus: issue.status,
    createdAt: at,
  };
  if (issue.description !== '') ticket.initialRequest = issue.description;
  insertTicket(ctx.db, ticket);
  saveSituation(ctx.db, {
    ticketId: ticket.id,
    situation: newSituation(),
    wait: null,
    updatedAt: at,
  });
  journal(ctx, ticket.id, `Chargé de Jira : ${issue.title}`, { status: issue.status });
  for (const comment of issue.comments) addComment(ctx, ticket.id, comment);
}

/** The due date of a Jira ticket follows Jira (ADR 0038); returns the change to journal, if any. */
function followDueDate(ctx: UsecaseContext, ticket: Ticket, issue: JiraIssue): string[] {
  if ((ticket.dueDate ?? null) === (issue.dueDate ?? null)) return [];
  saveDueDate(ctx.db, ticket.id, issue.dueDate ?? null);
  return [`Échéance Jira : ${issue.dueDate ?? 'aucune'}`];
}

/** Returns whether anything changed; each change is an entry of the journal. */
function update(ctx: UsecaseContext, ticket: Ticket, issue: JiraIssue): boolean {
  const changes: string[] = [];
  if (ticket.jiraStatus !== issue.status) {
    changes.push(`Statut Jira : ${ticket.jiraStatus ?? '—'} → ${issue.status}`);
  }
  if (ticket.title !== issue.title) changes.push(`Titre Jira : ${issue.title}`);
  if ((ticket.initialRequest ?? '') !== issue.description) {
    changes.push(`Description Jira :\n${issue.description}`);
  }
  changes.push(...followDueDate(ctx, ticket, issue));
  for (const change of changes) journal(ctx, ticket.id, change, {});
  if (changes.length > 0) {
    updateFromJira(ctx.db, ticket.id, {
      title: issue.title,
      initialRequest: issue.description,
      jiraStatus: issue.status,
      jiraUrl: issue.url,
    });
  }
  const known = knownJiraCommentIds(ctx.db, ticket.id);
  const fresh = issue.comments.filter((comment) => !known.has(comment.id));
  for (const comment of fresh) addComment(ctx, ticket.id, comment);
  return changes.length > 0 || fresh.length > 0;
}

function addComment(
  ctx: UsecaseContext,
  ticketId: string,
  comment: JiraIssue['comments'][number],
): void {
  journal(ctx, ticketId, `${comment.author} : ${comment.body}`, {
    commentId: comment.id,
    author: comment.author,
    at: comment.createdAt,
  });
}

function journal(ctx: UsecaseContext, ticketId: string, body: string, data: object): void {
  appendEntry(ctx.db, {
    id: ctx.newId(),
    ticketId,
    entryType: 'jiraImport',
    authorKind: 'jira',
    body,
    data,
    createdAt: ctx.now(),
  });
}
