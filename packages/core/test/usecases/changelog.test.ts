import { describe, expect, it } from 'vitest';
import type { ChangelogSection } from '../../src/usecases';
import {
  acceptChangelog,
  createTicket,
  deliverBatch,
  getTicket,
  proposeChangelog,
} from '../../src/usecases';
import { agent, testContext } from './context';

/** A project with the changelog on, recording what deliveries append. */
const setUp = (): { ctx: ReturnType<typeof testContext>; sections: ChangelogSection[] } => {
  const ctx = testContext();
  const sections: ChangelogSection[] = [];
  ctx.changelog = {
    append: (section) => {
      sections.push(section);
    },
  };
  createTicket(ctx, { title: 'Search by name' });
  createTicket(ctx, { title: 'Export orders' });
  return { ctx, sections };
};

/** The agent's context keeps the project's changelog. */
const asAgent = (ctx: ReturnType<typeof testContext>): ReturnType<typeof ctx.as> => ({
  ...ctx.as(agent),
  ...(ctx.changelog ? { changelog: ctx.changelog } : {}),
});

describe('delivery changelog (F22, ADR 0037)', () => {
  it('keeps the line an agent proposes until the developer accepts it, possibly reworded', () => {
    const { ctx } = setUp();
    proposeChangelog(asAgent(ctx), { key: 'LOC-1', line: 'search customers by name' });
    acceptChangelog(ctx, { key: 'LOC-1', line: 'Search customers by their name' });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.changelog).toEqual({
      proposed: null,
      accepted: 'Search customers by their name',
    });
    expect(ticket.ok && ticket.value.entries.slice(-2).map((entry) => entry.body)).toEqual([
      'Changelog line proposed: search customers by name',
      'Changelog line accepted: Search customers by their name',
    ]);
  });

  it('shows a new proposal for review, until the developer accepts a line', () => {
    const { ctx } = setUp();
    proposeChangelog(asAgent(ctx), { key: 'LOC-1', line: 'search by name' });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.changelog).toEqual({
      proposed: 'search by name',
      accepted: null,
    });
  });

  it('adds the accepted lines of the delivered tickets, and names those without one', () => {
    const { ctx, sections } = setUp();
    acceptChangelog(ctx, { key: 'LOC-1', line: 'Search customers by their name' });
    proposeChangelog(asAgent(ctx), { key: 'LOC-2', line: 'Export orders' });
    const delivered = deliverBatch(ctx, { name: 'Livraison du 20 oct.', keys: ['LOC-1', 'LOC-2'] });
    expect(sections.map(({ name, lines }) => ({ name, lines }))).toEqual([
      {
        name: 'Livraison du 20 oct.',
        lines: [{ key: 'LOC-1', line: 'Search customers by their name' }],
      },
    ]);
    expect(delivered.ok && delivered.value.changelog).toEqual({ written: 1, missing: ['LOC-2'] });
  });

  it('shows nothing and refuses lines when the changelog is off', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by name' });
    expect(proposeChangelog(ctx, { key: 'LOC-1', line: 'x' })).toEqual({
      ok: false,
      error: 'changelogDisabled',
    });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.changelog).toBeNull();
  });
});
