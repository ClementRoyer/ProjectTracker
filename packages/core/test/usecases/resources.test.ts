import { describe, expect, it } from 'vitest';
import {
  acquireResource,
  createTicket,
  getTicket,
  releaseResource,
  renewResource,
} from '../../src/usecases';
import { testContext } from './context';

// The test clock moves one minute at each reading: the lease is set long enough to measure.
const MINUTE = 60_000;

/** A project declaring the "e2e" resource, with two tickets. */
const setUp = (): ReturnType<typeof testContext> => {
  const ctx = testContext();
  ctx.resources = ['e2e'];
  ctx.resourceLeaseMs = 10 * MINUTE;
  createTicket(ctx, { title: 'Search by name' });
  createTicket(ctx, { title: 'Export orders' });
  return ctx;
};

const waitOf = (ctx: ReturnType<typeof testContext>, key: string): unknown => {
  const ticket = getTicket(ctx, { key });
  return ticket.ok ? ticket.value.situation.wait : null;
};

describe('shared resources (ADR 0008, 0034)', () => {
  it('gives the resource to one ticket at a time, and queues the other', () => {
    const ctx = setUp();
    expect(acquireResource(ctx, { key: 'LOC-1', resource: 'e2e' })).toMatchObject({
      ok: true,
      value: { granted: true },
    });
    expect(acquireResource(ctx, { key: 'LOC-2', resource: 'e2e' })).toMatchObject({
      ok: true,
      value: { granted: false, heldBy: 'LOC-1', position: 1 },
    });
  });

  it('shows the queued ticket waiting for the resource', () => {
    const ctx = setUp();
    acquireResource(ctx, { key: 'LOC-1', resource: 'e2e' });
    acquireResource(ctx, { key: 'LOC-2', resource: 'e2e' });
    expect(waitOf(ctx, 'LOC-2')).toMatchObject({ kind: 'resource', detail: 'e2e' });
  });

  it('hands the resource to the next in the queue once released, and lifts its wait', () => {
    const ctx = setUp();
    acquireResource(ctx, { key: 'LOC-1', resource: 'e2e' });
    acquireResource(ctx, { key: 'LOC-2', resource: 'e2e' });
    releaseResource(ctx, { key: 'LOC-1', resource: 'e2e' });
    expect(acquireResource(ctx, { key: 'LOC-2', resource: 'e2e' })).toMatchObject({
      value: { granted: true },
    });
    expect(waitOf(ctx, 'LOC-2')).toBeNull();
  });

  it('lets the lock go when its holder stops renewing it, so a crashed agent blocks no one', () => {
    const ctx = setUp();
    acquireResource(ctx, { key: 'LOC-1', resource: 'e2e' });
    ctx.advance(11 * MINUTE);
    expect(acquireResource(ctx, { key: 'LOC-2', resource: 'e2e' })).toMatchObject({
      value: { granted: true },
    });
  });

  it('keeps the lock of a holder that renews it', () => {
    const ctx = setUp();
    acquireResource(ctx, { key: 'LOC-1', resource: 'e2e' });
    ctx.advance(6 * MINUTE);
    renewResource(ctx, { key: 'LOC-1', resource: 'e2e' });
    ctx.advance(6 * MINUTE);
    expect(acquireResource(ctx, { key: 'LOC-2', resource: 'e2e' })).toMatchObject({
      value: { granted: false },
    });
  });

  it('refuses a resource the project does not declare', () => {
    const ctx = setUp();
    expect(acquireResource(ctx, { key: 'LOC-1', resource: 'e2e-typo' })).toEqual({
      ok: false,
      error: 'unknownResource',
    });
  });

  it('notes in the journal when the ticket takes and gives back the resource', () => {
    const ctx = setUp();
    acquireResource(ctx, { key: 'LOC-1', resource: 'e2e' });
    releaseResource(ctx, { key: 'LOC-1', resource: 'e2e' });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.entries.slice(-2).map((entry) => entry.body)).toEqual([
      'Resource "e2e" taken',
      'Resource "e2e" released',
    ]);
  });

  it('refuses to renew a lock the ticket does not hold', () => {
    const ctx = setUp();
    expect(renewResource(ctx, { key: 'LOC-1', resource: 'e2e' })).toEqual({
      ok: false,
      error: 'notResourceHolder',
    });
  });
});
