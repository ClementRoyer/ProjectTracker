<script lang="ts">
  import type { TicketSummary } from '@project-tracker/contract';
  import { groupOf, PHASE_LABELS, PHASES, waitText } from '../lib/pilotage';
  import { routeHash } from '../lib/route';
  import AgentRunning from './AgentRunning.svelte';
  import PriorityMark from './PriorityMark.svelte';

  let { tickets, now }: { tickets: TicketSummary[]; now: string } = $props();

  const columns = $derived([
    ...PHASES.map((phase) => ({
      title: PHASE_LABELS[phase].toUpperCase(),
      tickets: tickets.filter(
        (ticket) => ticket.situation.closedAt === null && ticket.situation.phase === phase,
      ),
    })),
    {
      title: 'CLOSED',
      tickets: tickets.filter((ticket) => ticket.situation.closedAt !== null),
    },
  ]);
</script>

<div class="board" aria-label="Ticket board">
  {#each columns as column (column.title)}
    <section aria-label={column.title}>
      <h2>{column.title} <span class="count">{column.tickets.length}</span></h2>
      {#each column.tickets as ticket (ticket.key)}
        {@const group = groupOf(ticket)}
        <a
          class="card"
          class:mine={group === 'me'}
          href={routeHash({ view: 'list', key: ticket.key })}
        >
          <span class="title">{ticket.title}</span>
          {#if ticket.group !== null}<span class="group">{ticket.group}</span>{/if}
          <span class="pill wait-{group}">{waitText(ticket, now)}</span>
          <span class="foot">
            {#if ticket.working}<AgentRunning />{/if}
            <span class="key">{ticket.key}</span>
            <PriorityMark priority={ticket.priority} />
          </span>
        </a>
      {/each}
    </section>
  {/each}
</div>

<style>
  .board {
    display: grid;
    grid-template-columns: repeat(7, minmax(170px, 1fr));
    gap: 10px;
    padding: 16px 20px;
    overflow-x: auto;
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    background: var(--sunken);
    border-radius: 10px;
    min-height: 40vh;
  }

  h2 {
    margin: 0;
    padding: 2px 4px 4px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--text-2);
  }

  .count {
    font-weight: 500;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 11px 12px;
    background: var(--surface);
    color: var(--text);
    border-radius: 8px;
    border: 1px solid var(--line);
    box-shadow: 0 1px 2px var(--shadow);
    text-decoration: none;
  }

  .card.mine {
    border: 2px solid var(--blue);
  }

  .title {
    font-size: 14px;
    line-height: 1.3;
  }

  .group {
    font-size: 11px;
    color: var(--muted);
  }

  .foot {
    display: flex;
    align-items: center;
    gap: 6px;
  }
</style>
