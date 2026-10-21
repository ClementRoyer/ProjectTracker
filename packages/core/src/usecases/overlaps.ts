import type * as op from '@project-tracker/contract';
import { findOverlaps, ok, type Result } from '../domain';
import { allTickets, changedFilesOfOpenTickets, replaceChangedFiles } from '../store';
import {
  loadTicket,
  type InputOf,
  type OutputOf,
  type UsecaseContext,
  type UsecaseError,
} from './context';

/** The CLI reports the files a ticket changes; the server never runs git (ADR 0014). */
export function reportChangedFiles(
  ctx: UsecaseContext,
  input: InputOf<typeof op.reportChangedFiles>,
): Result<OutputOf<typeof op.reportChangedFiles>, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const ticketId = loaded.value.ticket.id;
  replaceChangedFiles(ctx.db, ticketId, input.files, ctx.now());
  const keys = new Map(allTickets(ctx.db).map((ticket) => [ticket.id, ticket.key]));
  const overlaps = findOverlaps(changedFilesOfOpenTickets(ctx.db))
    .filter((overlap) => overlap.ticketIds.includes(ticketId))
    .map((overlap) => ({
      path: overlap.path,
      keys: overlap.ticketIds.filter((id) => id !== ticketId).map((id) => keys.get(id) ?? id),
    }));
  return ok({ overlaps });
}

/** The files the ticket changes (F23), each with the other open tickets that change it. */
export function changedFilesOf(
  ctx: UsecaseContext,
  ticketId: string,
): { path: string; repo: string | null; sharedWith: string[] }[] {
  const keys = new Map(allTickets(ctx.db).map((ticket) => [ticket.id, ticket.key]));
  const reports = changedFilesOfOpenTickets(ctx.db);
  const own = reports.find((report) => report.ticketId === ticketId)?.paths ?? [];
  const repos = ctx.repos ?? [];
  return own.map((path) => ({
    path,
    repo: repos.find((repo) => path.startsWith(`${repo.path}/`))?.name ?? null,
    sharedWith: reports
      .filter((report) => report.ticketId !== ticketId && report.paths.includes(path))
      .map((report) => keys.get(report.ticketId) ?? report.ticketId)
      .sort(),
  }));
}

/** The other open tickets that change a file this ticket changes. */
export function overlappingKeys(ctx: UsecaseContext, ticketId: string): string[] {
  const keys = new Map(allTickets(ctx.db).map((ticket) => [ticket.id, ticket.key]));
  const others = new Set(
    findOverlaps(changedFilesOfOpenTickets(ctx.db))
      .filter((overlap) => overlap.ticketIds.includes(ticketId))
      .flatMap((overlap) => overlap.ticketIds.filter((id) => id !== ticketId)),
  );
  return [...others].map((id) => keys.get(id) ?? id).sort();
}
