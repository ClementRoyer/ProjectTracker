import type * as op from '@project-tracker/contract';
import { fail, ok, type Result } from '../domain';
import { appendEntry, inTransaction, readChangelogLine, saveChangelogLine } from '../store';
import {
  authorOf,
  loadTicket,
  type InputOf,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';

/** An agent proposes the changelog line of the ticket (ADR 0037). */
export function proposeChangelog(
  ctx: UsecaseContext,
  input: InputOf<typeof op.proposeChangelog>,
): Result<OutputOf<typeof op.proposeChangelog>, UsecaseError> {
  return saveLine(ctx, input, 'proposed', 'Changelog line proposed');
}

/** The developer accepts the line, possibly reworded: only an accepted line is delivered. */
export function acceptChangelog(
  ctx: UsecaseContext,
  input: InputOf<typeof op.acceptChangelog>,
): Result<OutputOf<typeof op.acceptChangelog>, UsecaseError> {
  return saveLine(ctx, input, 'accepted', 'Changelog line accepted');
}

/** The ticket's line for its folder: a proposal shows until the developer reviews it; null without a changelog. */
export function changelogOf(
  ctx: UsecaseContext,
  ticketId: string,
): { proposed: string | null; accepted: string | null } | null {
  if (!ctx.changelog) return null;
  const line = readChangelogLine(ctx.db, ticketId);
  const reviewed =
    line.proposedAt !== null && line.acceptedAt !== null && line.acceptedAt >= line.proposedAt;
  return { proposed: reviewed ? null : line.proposed, accepted: line.accepted };
}

function saveLine(
  ctx: UsecaseContext,
  input: { key: string; line: string },
  which: 'proposed' | 'accepted',
  label: string,
): Result<{ entryId: string }, UsecaseError> {
  if (!ctx.changelog) return fail('changelogDisabled');
  const line = input.line.trim();
  if (line === '') return fail('emptyBody');
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const entryId = ctx.newId();
  const at = ctx.now();
  inTransaction(ctx.db, () => {
    saveChangelogLine(ctx.db, { ticketId: loaded.value.ticket.id, which, line, at });
    appendEntry(ctx.db, {
      id: entryId,
      ticketId: loaded.value.ticket.id,
      entryType: 'decision',
      ...authorOf(ctx.actor),
      body: `${label}: ${line}`,
      data: { changelog: which },
      createdAt: at,
    });
  });
  return ok({ entryId });
}
