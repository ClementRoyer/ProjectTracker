<script lang="ts">
  import { usageSummary, type UsageSummaryView } from '@project-tracker/contract';
  import { lastDays, periodLabel, type Period } from '../lib/summary';
  import type { Tracker } from '../lib/tracker.svelte';
  import { costText, tokensText } from '../lib/usage';

  let { tracker }: { tracker: Tracker } = $props();

  let period: Period = $state('week');
  let usage = $state<UsageSummaryView | null>(null);
  let daily = $state<UsageSummaryView | null>(null);

  const PERIODS = [
    { id: 'day', label: 'Day' },
    { id: 'week', label: 'Week' },
    { id: 'month', label: 'Month' },
  ] as const;

  const current = $derived(usage?.periods.find((p) => p.period === usage?.current) ?? null);
  const tokens = $derived((current?.measuredTokens ?? 0) + (current?.declaredTokens ?? 0));
  const measuredShare = $derived(
    tokens === 0 ? null : Math.round(((current?.measuredTokens ?? 0) / tokens) * 100),
  );
  const chart = $derived(
    daily
      ? lastDays(
          daily.periods.map((p) => ({
            period: p.period,
            tokens: p.measuredTokens + p.declaredTokens,
          })),
          daily.current,
        )
      : [],
  );
  const chartMax = $derived(Math.max(1, ...chart.map((day) => day.tokens)));
  const ticketMax = $derived(Math.max(1, ...(usage?.byTicket.map((row) => row.tokens) ?? [])));

  $effect(() => {
    void reload(period, tracker.version);
  });

  async function reload(which: Period, version: number): Promise<void> {
    const [summary, days] = await Promise.all([
      tracker.api.call(usageSummary, { period: which }),
      tracker.api.call(usageSummary, { period: 'day' }),
    ]);
    if (which !== period || version !== tracker.version) return;
    usage = summary.ok ? summary.value : null;
    daily = days.ok ? days.value : null;
  }
</script>

<section class="panel usage" aria-label="AI usage">
  <div class="title-row">
    <h1>AI usage</h1>
    <div role="group" aria-label="Period" class="periods">
      {#each PERIODS as choice (choice.id)}
        <button
          type="button"
          aria-pressed={period === choice.id}
          onclick={() => (period = choice.id)}
        >
          {choice.label}
        </button>
      {/each}
    </div>
  </div>
  <div class="stats">
    <div>
      <span class="muted">{usage ? periodLabel(period, usage.current) : ''}</span>
      <strong>{tokensText(tokens)}</strong><span class="muted">tokens</span>
    </div>
    <div>
      <span class="muted">Estimated cost</span>
      <strong>{costText(current?.estimatedCost ?? 0, usage?.currency ?? null)}</strong>
      <span class="muted"
        >of which {tokensText(current?.unpricedTokens ?? 0)} tokens without a known price</span
      >
    </div>
    <div>
      <span class="muted">Source</span>
      <strong>{measuredShare === null ? '—' : `${String(measuredShare)}%`}</strong>
      <span class="muted">
        {measuredShare === null
          ? 'nothing counted'
          : `measured · ${String(100 - measuredShare)}% declared`}
      </span>
    </div>
  </div>
  <h2>Last 7 days</h2>
  <div
    class="chart"
    role="img"
    aria-label={`Tokens per day: ${chart.map((day) => `${day.label} ${tokensText(day.tokens)}`).join(', ')}`}
  >
    {#each chart as day (day.key)}
      <div class="bar-cell">
        <span class="small">{day.tokens === 0 ? '—' : tokensText(day.tokens)}</span>
        <span class="bar" style:height="{Math.max(2, Math.round((day.tokens / chartMax) * 130))}px"
        ></span>
        <span class="small">{day.label}</span>
      </div>
    {/each}
  </div>
  <h2>Per ticket, since the beginning</h2>
  {#each usage?.byTicket ?? [] as row (row.key ?? '')}
    <div class="by-ticket">
      <span class="key">{row.key ?? 'No ticket'}</span>
      <span class="track">
        <span
          class="fill"
          class:none={row.key === null}
          style:width="{Math.round((row.tokens / ticketMax) * 100)}%"
        ></span>
      </span>
      <span>{tokensText(row.tokens)}</span>
      <span class="muted">{costText(row.estimatedCost, usage?.currency ?? null)}</span>
    </div>
  {:else}
    <span class="muted">No usage recorded.</span>
  {/each}
  <span class="muted note">
    Days, weeks and months are counted in your time zone; the week runs from Monday to Sunday.
  </span>
</section>

<style>
  .usage {
    flex: 1 1 460px;
    min-width: 0;
  }

  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }

  .periods {
    display: flex;
    gap: 2px;
    padding: 3px;
    background: var(--sunken);
    border-radius: 8px;
  }

  .periods button {
    padding: 6px 12px;
    border: 0;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
    background: transparent;
    color: var(--text-2);
  }

  .periods button[aria-pressed='true'] {
    background: var(--surface);
    color: var(--text);
    font-weight: 600;
    box-shadow: 0 1px 2px var(--shadow);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
  }

  .stats div {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 12px;
    background: var(--sunken);
    border-radius: 10px;
  }

  .stats strong {
    font-size: 24px;
  }

  .chart {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 8px;
    height: 180px;
  }

  .bar-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 4px;
  }

  .small {
    font-size: 11px;
    color: var(--muted);
  }

  .bar {
    width: 100%;
    max-width: 44px;
    border-radius: 4px 4px 0 0;
    background: var(--bar);
  }

  .by-ticket {
    display: grid;
    grid-template-columns: 90px 1fr 60px 60px;
    gap: 10px;
    align-items: center;
    font-size: 13px;
  }

  .track {
    height: 10px;
    background: var(--sunken);
    border-radius: 5px;
  }

  .fill {
    display: block;
    height: 100%;
    border-radius: 5px;
    background: var(--blue);
  }

  .fill.none {
    background: var(--bar-2);
  }

  .note {
    font-size: 12px;
  }
</style>
