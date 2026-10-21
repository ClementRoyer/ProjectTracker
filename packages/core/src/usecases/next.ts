import type * as op from '@project-tracker/contract';
import { fail, ok, periodKey, suggestNext as rank, type Result } from '../domain';
import {
  allTickets,
  appendEntry,
  findOrCreateGroup,
  inTransaction,
  readSituation,
  saveDueDate,
  saveGroup,
  saveSize,
} from '../store';
import {
  authorOf,
  loadTicket,
  type InputOf,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';
import { toSummary } from './views';

const SIZE_LABELS = { small: 'petite', medium: 'moyenne', large: 'grande' } as const;

/** The developer sets the due date of a local ticket; a Jira ticket's follows Jira (ADR 0038). */
export function setDueDate(
  ctx: UsecaseContext,
  input: InputOf<typeof op.setDueDate>,
): Result<OutputOf<typeof op.setDueDate>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  if (loaded.value.ticket.origin === 'jira') return fail('jiraOwnsDueDate');
  inTransaction(ctx.db, () => {
    saveDueDate(ctx.db, loaded.value.ticket.id, input.dueDate);
    note(ctx, loaded.value.ticket.id, `Échéance : ${input.dueDate ?? 'aucune'}`);
  });
  return ok({ dueDate: input.dueDate });
}

/** An agent or the developer estimates the size; the last one wins. */
export function setSize(
  ctx: UsecaseContext,
  input: InputOf<typeof op.setSize>,
): Result<OutputOf<typeof op.setSize>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  inTransaction(ctx.db, () => {
    saveSize(ctx.db, loaded.value.ticket.id, input.size);
    note(
      ctx,
      loaded.value.ticket.id,
      `Taille : ${input.size === null ? 'non estimée' : SIZE_LABELS[input.size]}`,
    );
  });
  return ok({ size: input.size });
}

/** The developer puts the ticket in a named group, made at first use, or takes it out (ADR 0040). */
export function setGroup(
  ctx: UsecaseContext,
  input: InputOf<typeof op.setGroup>,
): Result<OutputOf<typeof op.setGroup>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const name = input.group?.trim() || null;
  inTransaction(ctx.db, () => {
    const groupId = name === null ? null : findOrCreateGroup(ctx.db, name, ctx.newId());
    saveGroup(ctx.db, loaded.value.ticket.id, groupId);
    note(ctx, loaded.value.ticket.id, `Groupe : ${name ?? 'aucun'}`);
  });
  return ok({ group: name });
}

/** Open tickets nobody works on and that wait for nobody, ranked (ADR 0038). */
export function suggestNext(
  ctx: UsecaseContext,
  _input: InputOf<typeof op.suggestNext>,
): Result<OutputOf<typeof op.suggestNext>, UsecaseError> {
  const timeZone = ctx.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const summaries = allTickets(ctx.db).flatMap((ticket) => {
    const record = readSituation(ctx.db, ticket.id);
    return record ? [toSummary(ctx, ticket, record)] : [];
  });
  const candidates = summaries.filter(
    (summary) =>
      summary.situation.closedAt === null && summary.situation.wait === null && !summary.working,
  );
  const titles = new Map(summaries.map((summary) => [summary.key, summary.title]));
  const ranked = rank(
    candidates.map((summary) => ({
      key: summary.key,
      priority: summary.priority,
      phase: summary.situation.phase,
      dueDate: summary.dueDate,
      size: summary.size,
    })),
    periodKey(ctx.now(), 'day', timeZone),
  );
  return ok({
    suggestions: ranked.map((suggestion) => ({
      ...suggestion,
      title: titles.get(suggestion.key) ?? '',
    })),
  });
}

function note(ctx: UsecaseContext, ticketId: string, body: string): void {
  appendEntry(ctx.db, {
    id: ctx.newId(),
    ticketId,
    entryType: 'situationChange',
    ...authorOf(ctx.actor),
    body,
    createdAt: ctx.now(),
  });
}
