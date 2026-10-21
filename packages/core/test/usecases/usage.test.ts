import { describe, expect, it } from 'vitest';
import type { UsecaseContext } from '../../src/usecases';
import {
  createTicket,
  identify,
  introduce,
  recordUsage,
  takeTicket,
  usageSummary,
} from '../../src/usecases';
import { testContext } from './context';

const line = {
  model: 'model-a',
  inputTokens: 1_000_000,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
};

const agentOn = (ctx: ReturnType<typeof testContext>, key: string): UsecaseContext => {
  const introduced = introduce(ctx, { name: 'front-1' });
  const actor = introduced.ok ? identify(ctx, introduced.value.token) : null;
  if (!actor) throw new Error('no conversation');
  const agent = ctx.as(actor);
  takeTicket(agent, { key, role: 'front' });
  return agent;
};

describe('AI usage (ADR 0012, F20)', () => {
  it('ties the usage of a conversation to the ticket it holds', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by customer name' });
    recordUsage(agentOn(ctx, 'LOC-1'), { provenance: 'measured', usage: [line] });
    ctx.prices = { 'model-a': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 } };
    const summary = usageSummary(ctx, { period: 'day' });
    expect(summary.ok && summary.value.byTicket).toEqual([
      { key: 'LOC-1', tokens: 1_000_000, estimatedCost: 3 },
    ]);
  });

  it('keeps measured and declared tokens apart, and counts the tokens of an unknown model', () => {
    const ctx = testContext();
    createTicket(ctx, { title: 'Search by customer name' });
    const agent = agentOn(ctx, 'LOC-1');
    recordUsage(agent, { provenance: 'measured', usage: [line] });
    recordUsage(agent, {
      provenance: 'declared',
      usage: [{ ...line, model: 'unknown', inputTokens: 500 }],
    });
    ctx.prices = { 'model-a': { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 } };
    const summary = usageSummary(ctx, { period: 'week' });
    expect(summary.ok && summary.value.periods).toEqual([
      {
        period: '2026-W43',
        measuredTokens: 1_000_000,
        declaredTokens: 500,
        unpricedTokens: 500,
        estimatedCost: 3,
      },
    ]);
  });

  it('names the current period, so that the page finds today, this week or this month', () => {
    const ctx = testContext();
    const summary = usageSummary(ctx, { period: 'week' });
    expect(summary.ok && summary.value.current).toBe('2026-W43');
  });

  it('gives the currency of the price table, so that the cost is not shown in a guessed one', () => {
    const ctx = testContext();
    ctx.currency = 'EUR';
    const summary = usageSummary(ctx, { period: 'day' });
    expect(summary.ok && summary.value.currency).toBe('EUR');
  });

  it('records usage without a ticket when the conversation holds none', () => {
    const ctx = testContext();
    const introduced = introduce(ctx, { name: 'front-1' });
    const actor = introduced.ok ? identify(ctx, introduced.value.token) : null;
    if (!actor) throw new Error('no conversation');
    recordUsage(ctx.as(actor), { provenance: 'measured', usage: [line] });
    const summary = usageSummary(ctx, { period: 'month' });
    expect(summary.ok && summary.value.byTicket).toEqual([
      { key: null, tokens: 1_000_000, estimatedCost: 0 },
    ]);
  });
});
