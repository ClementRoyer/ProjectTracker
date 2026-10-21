import { describe, expect, it } from 'vitest';
import { computeWait } from '../../src/domain';

const none = { openQuestions: [], backendRequests: [], queuedResources: [], blockedFiles: [] };

describe('wait', () => {
  it('reports no wait when nothing blocks the ticket', () => {
    expect(computeWait(none)).toBeNull();
  });

  it('waits for the developer while a question is open, since the oldest one', () => {
    const wait = computeWait({
      ...none,
      openQuestions: [{ since: '2026-10-19T09:00:00.000Z' }, { since: '2026-10-18T09:00:00.000Z' }],
    });
    expect(wait).toEqual({ kind: 'developer', since: '2026-10-18T09:00:00.000Z' });
  });

  it('puts the developer first, since what needs them must be seen', () => {
    const wait = computeWait({
      ...none,
      openQuestions: [{ since: '2026-10-19T09:00:00.000Z' }],
      backendRequests: [{ since: '2026-10-17T09:00:00.000Z' }],
    });
    expect(wait?.kind).toBe('developer');
  });

  it('otherwise shows the oldest wait', () => {
    const wait = computeWait({
      ...none,
      backendRequests: [{ since: '2026-10-19T09:00:00.000Z' }],
      queuedResources: [{ name: 'e2e', since: '2026-10-18T09:00:00.000Z' }],
    });
    expect(wait).toEqual({ kind: 'resource', since: '2026-10-18T09:00:00.000Z', detail: 'e2e' });
  });

  it('names the ticket that holds a blocking file', () => {
    const wait = computeWait({
      ...none,
      blockedFiles: [{ path: 'src/a.ts', heldBy: 'ABC-12', since: '2026-10-19T09:00:00.000Z' }],
    });
    expect(wait).toEqual({
      kind: 'fileHold',
      since: '2026-10-19T09:00:00.000Z',
      detail: 'src/a.ts (ABC-12)',
    });
  });

  it('keeps a wait declared for the outside world, such as an end user', () => {
    const declared = {
      kind: 'endUser',
      since: '2026-10-15T09:00:00.000Z',
      detail: 'Test by accounting',
    } as const;
    expect(computeWait({ ...none, declared })).toEqual(declared);
  });
});
