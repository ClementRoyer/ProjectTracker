<script lang="ts">
  import type { TicketSummary } from '@project-tracker/contract';
  import type { Snippet } from 'svelte';
  import { groupTickets, sortTickets, type GroupId, type SortOrder } from '../lib/pilotage';
  import TicketRow from './TicketRow.svelte';

  let {
    tickets,
    now,
    selectedKey,
    waitingCount,
    onTriage,
    children,
  }: {
    tickets: TicketSummary[];
    now: string;
    selectedKey: string | null;
    waitingCount: number;
    onTriage: () => void;
    /** Shown under the triage button: what to take next (ADR 0038). */
    children?: Snippet;
  } = $props();

  let order: SortOrder = $state('wait');
  let collapsed: Partial<Record<GroupId, boolean>> = $state({ done: true });

  const groups = $derived(
    groupTickets(tickets).map((group) => ({
      ...group,
      tickets: sortTickets(group.tickets, order),
    })),
  );
  const allCollapsed = $derived(groups.every((group) => collapsed[group.id] === true));

  function toggleAll(): void {
    collapsed = allCollapsed ? {} : Object.fromEntries(groups.map((group) => [group.id, true]));
  }
</script>

{#if waitingCount > 0}
  <button type="button" class="triage" onclick={onTriage}>
    <strong>
      {waitingCount === 1 ? '1 décision t’attend' : `${String(waitingCount)} décisions t’attendent`}
    </strong>
    <span>Les traiter une par une, du plus ancien au plus récent</span>
  </button>
{/if}

{@render children?.()}

<div class="tools">
  <label for="sortList">Trier par</label>
  <select id="sortList" bind:value={order}>
    <option value="wait">Attente la plus ancienne</option>
    <option value="activity">Dernière activité</option>
    <option value="phase">Phase la plus avancée</option>
    <option value="priority">Priorité</option>
    <option value="key">Clé du ticket</option>
  </select>
  <button type="button" onclick={toggleAll}>{allCollapsed ? 'Tout déplier' : 'Tout replier'}</button
  >
</div>

{#if tickets.length === 0}
  <p class="empty">Aucun ticket. Crée-en un, ou charge tes tickets Jira.</p>
{/if}

{#each groups as group (group.id)}
  {@const open = collapsed[group.id] !== true}
  <section aria-label={group.title}>
    <h2>
      <button
        type="button"
        class="group tone-{group.id}"
        aria-expanded={open}
        onclick={() => (collapsed = { ...collapsed, [group.id]: open })}
      >
        <svg
          class="chevron"
          class:closed={!open}
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          aria-hidden="true"
        >
          <path d="M3 4.5l3 3 3-3"></path>
        </svg>
        <span>{group.title}</span>
        <span class="count">{group.tickets.length}</span>
        {#if !open}
          <span class="summary">{group.tickets.map((ticket) => ticket.key).join(' · ')}</span>
        {/if}
      </button>
    </h2>
    {#if open}
      {#each group.tickets as ticket (ticket.key)}
        <TicketRow {ticket} group={group.id} {now} selected={ticket.key === selectedKey} />
      {/each}
    {/if}
  </section>
{/each}

<style>
  .triage {
    margin: 12px 12px 4px;
    display: flex;
    flex-direction: column;
    gap: 3px;
    align-items: flex-start;
    padding: 13px 16px;
    border: 0;
    border-radius: 10px;
    background: var(--blue);
    color: var(--on-blue);
    text-align: left;
    cursor: pointer;
  }

  .triage strong {
    font-size: 16px;
  }

  .triage span {
    font-size: 13px;
    opacity: 0.85;
  }

  .tools {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 10px 16px 4px;
  }

  label {
    font-size: 12px;
    color: var(--muted);
  }

  select {
    flex: 1 1 140px;
    padding: 6px 8px;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    font-size: 13px;
  }

  .tools button {
    padding: 6px 10px;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--text);
    border-radius: 6px;
    font-size: 12px;
    cursor: pointer;
  }

  .empty {
    padding: 12px 16px;
    color: var(--muted);
  }

  h2 {
    margin: 0;
  }

  .group {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 12px 16px 6px;
    border: 0;
    background: transparent;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-align: left;
    cursor: pointer;
  }

  .tone-me {
    color: var(--blue);
  }

  .tone-agent {
    color: var(--text);
  }

  .tone-other,
  .tone-stale {
    color: var(--amber);
  }

  .tone-none,
  .tone-done {
    color: var(--muted);
  }

  .chevron {
    flex: none;
    transition: transform 0.15s;
  }

  .chevron.closed {
    transform: rotate(-90deg);
  }

  .count {
    font-weight: 500;
  }

  .summary {
    margin-left: auto;
    font-weight: 500;
    letter-spacing: 0;
    color: var(--muted);
  }
</style>
