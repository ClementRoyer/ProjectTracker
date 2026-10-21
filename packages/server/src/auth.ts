import { randomUUID, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { Actor, JiraReader } from '@project-tracker/core/domain';
import {
  identify,
  type ChangelogSection,
  type UsecaseContext,
} from '@project-tracker/core/usecases';
import type { Config } from './config';

export interface AppOptions {
  db: DatabaseSync;
  config: Config;
  developerToken: string;
  launcherToken?: string | null;
  /** Built at start from the configuration and the environment, when Jira is configured. */
  jira?: JiraReader;
  /** The folder of the database, where attachments are kept (ADR 0035). */
  dataDir?: string;
  /** The machine's registry of projects, for the project menu (ADR 0039). */
  registryFile?: string;
  /** The reference documents of the project (ADR 0040). */
  documents?: { list: () => string[]; read: (path: string) => string | null };
  /** Where deliveries add their section, when the project turns the changelog on (ADR 0037). */
  changelog?: { append: (section: ChangelogSection) => void };
  /** The folder of the built page, when there is one. */
  webRoot?: string;
}

export type Caller =
  { kind: 'developer' | 'launcher'; actor: Actor } | { kind: 'agent'; actor: Actor };

const MINUTE_MS = 60_000;
/** A resource lock without renewal for this long goes to the next ticket (ADR 0034). */
const RESOURCE_LEASE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** The actor of `introduce`, before the conversation has a token. */
export const ANONYMOUS: Actor = { kind: 'agent', agentId: '' };

export function usecaseContext(options: AppOptions, actor: Actor): UsecaseContext {
  return {
    db: options.db,
    actor,
    now: () => new Date().toISOString(),
    newId: () => randomUUID(),
    staleAfterMs: options.config.staleAfterHours * HOUR_MS,
    workingTimeoutMs: options.config.workingTimeoutMinutes * MINUTE_MS,
    ...(options.jira ? { jira: options.jira } : {}),
    prices: options.config.prices,
    resources: options.config.resources,
    repos: options.config.repos,
    ...(options.documents ? { documents: options.documents } : {}),
    ...(options.dataDir === undefined ? {} : { dataDir: options.dataDir }),
    ...(options.changelog ? { changelog: options.changelog } : {}),
    resourceLeaseMs: RESOURCE_LEASE_MS,
    ...(options.config.currency ? { currency: options.config.currency } : {}),
    ...(options.config.timeZone ? { timeZone: options.config.timeZone } : {}),
  };
}

/** Who holds this token: the developer (ADR 0027), the launcher (ADR 0010) or an agent conversation (ADR 0011). */
export function resolveCaller(options: AppOptions, token: string | null): Caller | null {
  if (token === null || token === '') return null;
  if (sameSecret(token, options.developerToken)) {
    return { kind: 'developer', actor: { kind: 'developer' } };
  }
  if (options.launcherToken && sameSecret(token, options.launcherToken)) {
    return { kind: 'launcher', actor: { kind: 'developer' } };
  }
  const actor = identify(usecaseContext(options, ANONYMOUS), token);
  return actor ? { kind: 'agent', actor } : null;
}

/**
 * The token of a request: `Authorization: Bearer …`, or `X-Tracker-Token` for the page, since some proxies (cloud
 * IDEs' port forwarding) keep the Authorization header for their own login (ADR 0055).
 */
export function requestToken(header: (name: string) => string | undefined): string | null {
  return bearerToken(header('authorization')) ?? (header('x-tracker-token') || null);
}

export function bearerToken(header: string | undefined | null): string | null {
  return header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
