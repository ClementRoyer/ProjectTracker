import type { DatabaseSync } from 'node:sqlite';
import type { Operation } from '@project-tracker/contract';
import type { z } from 'zod';
import {
  fail,
  ok,
  type Actor,
  type Instant,
  type JiraReader,
  type PriceTable,
  type Result,
  type Ticket,
} from '../domain';
import { findTicketByKey, readSituation, type SituationRecord } from '../store';

/** What a use case needs: the database, who acts, and the clock and ids it must not invent. */
export interface UsecaseContext {
  db: DatabaseSync;
  actor: Actor;
  now: () => Instant;
  newId: () => string;
  /** A ticket in progress with no news for this long is "stale" (F11). */
  staleAfterMs: number;
  /** After this silence, what an agent wrote no longer shows it at work (ADR 0028). */
  workingTimeoutMs: number;
  /** Reads Jira, when the project has it configured (F2). */
  jira?: JiraReader;
  /** Model prices per million tokens, from the configuration (ADR 0012). */
  prices?: PriceTable;
  /** Present when the project turns the changelog on: where deliveries add their section (ADR 0037). */
  changelog?: { append: (section: ChangelogSection) => void };
  /** The folder of the database, where attachments are kept (ADR 0035). */
  dataDir?: string;
  /** The reference documents the configuration names, read-only (ADR 0040). */
  documents?: { list: () => string[]; read: (path: string) => string | null };
  /** The repositories the project names, paths from its root (ADR 0040). */
  repos?: readonly { name: string; path: string }[];
  /** The shared resources the project declares (ADR 0034). */
  resources?: readonly string[];
  /** How long a resource lock lasts without renewal (60 s on the server, ADR 0034). */
  resourceLeaseMs?: number;
  /** The currency of the prices, an ISO 4217 code (ADR 0029). */
  currency?: string;
  /** The developer's time zone, for days, weeks and months (ADR 0022). */
  timeZone?: string;
}

/** What a QA delivery adds to the changelog (ADR 0037). */
export interface ChangelogSection {
  name: string;
  at: Instant;
  lines: { key: string; line: string }[];
}

export type InputOf<O> = O extends Operation<infer I, z.ZodType> ? z.infer<I> : never;
export type OutputOf<O> = O extends Operation<z.ZodType, infer R> ? z.infer<R> : never;

/** Business refusals a caller can receive; bugs throw instead (docs/code-style.md). */
export type UsecaseError =
  | 'ticketNotFound'
  | 'emptyTitle'
  | 'emptyBody'
  | 'ticketClosed'
  | 'alreadyInPhase'
  | 'progressNoteRequired'
  | 'onlyDeveloperCloses'
  | 'notValidated'
  | 'batchNotFound'
  | 'alreadyValidated'
  | 'roleTaken'
  | 'questionNotFound'
  | 'questionAnswered'
  | 'noTicket'
  | 'ticketAmbiguous'
  | 'nothingToAcknowledge'
  | 'jiraNotConfigured'
  | 'jiraUnreachable'
  | 'executionNotFound'
  | 'executionFinished'
  | 'unknownResource'
  | 'notResourceHolder'
  | 'attachmentNotFound'
  | 'changelogDisabled'
  | 'jiraOwnsDueDate'
  | 'documentNotFound';

export interface LoadedTicket {
  ticket: Ticket;
  record: SituationRecord;
}

export function loadTicket(ctx: UsecaseContext, key: string): Result<LoadedTicket, UsecaseError> {
  const ticket = findTicketByKey(ctx.db, key);
  if (!ticket) return fail('ticketNotFound');
  const record = readSituation(ctx.db, ticket.id);
  if (!record) throw new Error(`Ticket ${key} has no situation row`);
  return ok({ ticket, record });
}

/** The author fields of an entry written by this actor. */
export function authorOf(actor: Actor): { authorKind: 'developer' | 'agent'; sessionId?: string } {
  if (actor.kind === 'agent' && actor.sessionId !== undefined) {
    return { authorKind: 'agent', sessionId: actor.sessionId };
  }
  return { authorKind: actor.kind };
}
