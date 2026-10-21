import { describe, expect, it } from 'vitest';
import {
  closeTicket,
  createTicket,
  deliverBatch,
  getTicket,
  listBatches,
  validateBatch,
} from '../../src/usecases';
import { testContext } from './context';

const twoTickets = (): ReturnType<typeof testContext> => {
  const ctx = testContext();
  createTicket(ctx, { title: 'Search by customer name' });
  createTicket(ctx, { title: 'Export orders' });
  return ctx;
};

const phaseOf = (ctx: ReturnType<typeof testContext>, key: string): unknown => {
  const ticket = getTicket(ctx, { key });
  return ticket.ok ? [ticket.value.situation.phase, ticket.value.situation.progress.state] : null;
};

describe('QA deliveries (F19)', () => {
  it('moves every delivered ticket to a done QA delivery', () => {
    const ctx = twoTickets();
    const batch = deliverBatch(ctx, { name: 'Delivery of 20 Oct', keys: ['LOC-1', 'LOC-2'] });
    expect(batch.ok && batch.value).toMatchObject({
      name: 'Delivery of 20 Oct',
      keys: ['LOC-1', 'LOC-2'],
      validatedAt: null,
    });
    expect(phaseOf(ctx, 'LOC-2')).toEqual(['qaDelivery', 'done']);
  });

  it('delivers nothing when one ticket is unknown', () => {
    const ctx = twoTickets();
    expect(deliverBatch(ctx, { name: 'Bad', keys: ['LOC-1', 'NOPE-9'] })).toEqual({
      ok: false,
      error: 'ticketNotFound',
    });
    expect(phaseOf(ctx, 'LOC-1')).toEqual(['todo', 'notStarted']);
  });

  it('moves every ticket to a done QA validation once the delivery is validated, so it can be closed', () => {
    const ctx = twoTickets();
    const batch = deliverBatch(ctx, { name: 'Delivery of 20 Oct', keys: ['LOC-1'] });
    if (!batch.ok) throw new Error(batch.error);
    const validated = validateBatch(ctx, { batchId: batch.value.id });
    expect(validated.ok && validated.value.validatedAt).not.toBeNull();
    expect(phaseOf(ctx, 'LOC-1')).toEqual(['qaValidation', 'done']);
    expect(closeTicket(ctx, { key: 'LOC-1' }).ok).toBe(true);
  });

  it('refuses to validate a delivery twice', () => {
    const ctx = twoTickets();
    const batch = deliverBatch(ctx, { name: 'Delivery of 20 Oct', keys: ['LOC-1'] });
    if (!batch.ok) throw new Error(batch.error);
    validateBatch(ctx, { batchId: batch.value.id });
    expect(validateBatch(ctx, { batchId: batch.value.id })).toEqual({
      ok: false,
      error: 'alreadyValidated',
    });
  });

  it('lists the deliveries, the most recent first', () => {
    const ctx = twoTickets();
    deliverBatch(ctx, { name: 'First', keys: ['LOC-1'] });
    deliverBatch(ctx, { name: 'Second', keys: ['LOC-2'] });
    const batches = listBatches(ctx, {});
    expect(batches.ok && batches.value.batches.map((b) => b.name)).toEqual(['Second', 'First']);
  });
});
