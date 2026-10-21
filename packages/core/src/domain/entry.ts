import type { Role } from './assignment';
import type { Instant } from './time';

export const ENTRY_TYPES = [
  'progress',
  'decision',
  'exchange',
  'feedback',
  'question',
  'answer',
  'request',
  'situationChange',
  'testRun',
  'jiraImport',
] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];

export type AuthorKind = 'developer' | 'agent' | 'jira' | 'launcher' | 'system';

/** An element of the journal: never changed, corrected by a newer entry. */
export interface Entry {
  id: string;
  ticketId: string;
  entryType: EntryType;
  authorKind: AuthorKind;
  sessionId?: string;
  role?: Role;
  body: string;
  data?: unknown;
  replyTo?: string;
  createdAt: Instant;
}
