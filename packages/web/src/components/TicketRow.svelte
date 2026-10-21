<script lang="ts">
  import type { TicketSummary } from '@project-tracker/contract';
  import { ago, shortDate } from '../lib/format';
  import { PHASE_LABELS, PHASES, progressText, waitText, type GroupId } from '../lib/pilotage';
  import { routeHash } from '../lib/route';
  import AgentRunning from './AgentRunning.svelte';
  import PriorityMark from './PriorityMark.svelte';

  let {
    ticket,
    group,
    now,
    selected,
  }: { ticket: TicketSummary; group: GroupId; now: string; selected: boolean } = $props();

  const phaseIndex = $derived(PHASES.indexOf(ticket.situation.phase));
  const phaseLabel = $derived(group === 'done' ? 'Closed' : PHASE_LABELS[ticket.situation.phase]);
</script>

<a
  class="row"
  class:selected
  href={routeHash({ view: 'list', key: ticket.key })}
  aria-current={selected ? 'true' : undefined}
>
  <span class="top">
    <span class="key-line">
      <span class="key">{ticket.key}</span>
      <PriorityMark priority={ticket.priority} />
      {#if ticket.dueDate !== null}<span class="due">due {shortDate(ticket.dueDate)}</span>{/if}
    </span>
    <span class="meta">
      {#if ticket.working}<AgentRunning />{/if}
      {#if ticket.unread}<span class="unread" role="img" aria-label="Novelties"></span>{/if}
      {ago(ticket.lastActivityAt, now)}
    </span>
  </span>
  <span class="title" class:bold={ticket.unread}>{ticket.title}</span>
  {#if ticket.group !== null}<span class="group">{ticket.group}</span>{/if}
  <span class="progress">{progressText(ticket)}</span>
  <span class="phases" aria-label="Phase: {phaseLabel}">
    {#each PHASES as phase, index (phase)}
      <span class="step tone-{group}" class:reached={index <= phaseIndex}></span>
    {/each}
    <span class="phase">{phaseLabel}</span>
  </span>
  <span class="pill wait-{group}">{waitText(ticket, now)}</span>
  {#if ticket.overlaps.length > 0}
    <span class="overlap">Files in common with {ticket.overlaps.join(', ')}</span>
  {/if}
</a>

<style>
  .row {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin: 0 8px 6px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid transparent;
    color: var(--text);
    text-decoration: none;
  }

  .row:hover {
    background: var(--surface-2);
  }

  .row.selected {
    background: var(--surface);
    border-color: var(--text);
    box-shadow: 0 1px 3px var(--shadow);
  }

  .top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .key-line {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .due {
    font-size: 11px;
    color: var(--muted);
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--muted);
  }

  .unread {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--blue);
  }

  .title {
    font-size: 14px;
    line-height: 1.3;
    font-weight: 500;
  }

  .title.bold {
    font-weight: 700;
  }

  .group {
    font-size: 11px;
    color: var(--muted);
  }

  .progress {
    font-size: 12px;
    line-height: 1.35;
    color: var(--text-2);
  }

  .phases {
    display: flex;
    gap: 3px;
    align-items: center;
  }

  .step {
    width: 22px;
    height: 4px;
    border-radius: 2px;
    background: var(--track);
  }

  .step.reached.tone-me {
    background: var(--blue);
  }

  .step.reached.tone-agent {
    background: var(--text);
  }

  .step.reached.tone-other,
  .step.reached.tone-stale {
    background: var(--amber);
  }

  .step.reached.tone-none,
  .step.reached.tone-done {
    background: var(--muted);
  }

  .phase {
    margin-left: 6px;
    font-size: 11px;
    color: var(--muted);
  }

  @media (max-width: 760px) {
    .row {
      margin: 0 12px 6px;
    }
  }

  .overlap {
    font-size: 12px;
    color: var(--amber);
    font-weight: 600;
  }
</style>
