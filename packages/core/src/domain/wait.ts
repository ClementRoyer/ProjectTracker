import type { Instant } from './time';

export type DeclaredWaitKind = 'endUser' | 'partner';

export type Wait =
  | { kind: 'developer'; since: Instant }
  | { kind: 'backend'; since: Instant }
  | { kind: 'resource'; since: Instant; detail: string }
  | { kind: 'fileHold'; since: Instant; detail: string }
  | { kind: DeclaredWaitKind; since: Instant; detail: string };

export interface WaitSources {
  openQuestions: readonly { since: Instant }[];
  backendRequests: readonly { since: Instant }[];
  queuedResources: readonly { name: string; since: Instant }[];
  blockedFiles: readonly { path: string; heldBy: string; since: Instant }[];
  declared?: { kind: DeclaredWaitKind; since: Instant; detail: string };
}

/**
 * What the ticket waits for. A wait on the developer comes first, because it is
 * what they must see; otherwise the oldest wait is shown.
 */
export function computeWait(sources: WaitSources): Wait | null {
  const question = oldest(sources.openQuestions);
  if (question) return { kind: 'developer', since: question.since };

  const candidates: Wait[] = [
    ...sources.backendRequests.map((request) => ({
      kind: 'backend' as const,
      since: request.since,
    })),
    ...sources.queuedResources.map((queued) => ({
      kind: 'resource' as const,
      since: queued.since,
      detail: queued.name,
    })),
    ...sources.blockedFiles.map((file) => ({
      kind: 'fileHold' as const,
      since: file.since,
      detail: `${file.path} (${file.heldBy})`,
    })),
    ...(sources.declared ? [sources.declared] : []),
  ];
  return oldest(candidates) ?? null;
}

function oldest<T extends { since: Instant }>(items: readonly T[]): T | undefined {
  return items.reduce<T | undefined>(
    (found, item) => (found === undefined || item.since < found.since ? item : found),
    undefined,
  );
}
