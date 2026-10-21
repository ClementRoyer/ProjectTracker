<script lang="ts">
  import {
    changePhase,
    closeTicket,
    sendMessage,
    setDueDate,
    setGroup,
    setPriority,
    setSize,
    type TicketDetail,
  } from '@project-tracker/contract';
  import { PHASE_LABELS, PHASES, PRIORITY_LABELS, toPriority } from '../lib/pilotage';
  import type { Tracker } from '../lib/tracker.svelte';

  let { tracker, ticket }: { tracker: Tracker; ticket: TicketDetail } = $props();

  function chooseGroup(value: string): void {
    const group = value.trim();
    if (group === (ticket.group ?? '')) return;
    void tracker.act(setGroup, { key: ticket.key, group: group === '' ? null : group });
  }

  let phaseMenuOpen = $state(false);

  const SIZES = [
    { value: '', label: '—' },
    { value: 'small', label: 'Petite' },
    { value: 'medium', label: 'Moyenne' },
    { value: 'large', label: 'Grande' },
  ] as const;

  function toSize(value: string): 'small' | 'medium' | 'large' | null {
    return value === 'small' || value === 'medium' || value === 'large' ? value : null;
  }
  const closed = $derived(ticket.situation.closedAt !== null);

  async function movePhase(phase: (typeof PHASES)[number]): Promise<void> {
    phaseMenuOpen = false;
    await tracker.act(changePhase, { key: ticket.key, phase });
  }

  async function askForNews(): Promise<void> {
    const sent = await tracker.act(sendMessage, {
      key: ticket.key,
      to: 'front',
      body: 'Où en es-tu ?',
    });
    if (sent) tracker.toast.show('Demande envoyée à l’intervenant front.');
  }
</script>

<div class="actions">
  <label class="priority">
    Groupe
    <input
      class="group"
      list="groups-{ticket.key}"
      value={ticket.group ?? ''}
      placeholder="aucun"
      disabled={closed}
      onchange={(event) => {
        chooseGroup(event.currentTarget.value);
      }}
    />
    <datalist id="groups-{ticket.key}">
      {#each tracker.groups as group (group)}
        <option value={group}></option>
      {/each}
    </datalist>
  </label>
  <label class="priority">
    Taille
    <select
      value={ticket.size ?? ''}
      disabled={closed}
      onchange={(event) => {
        void tracker.act(setSize, { key: ticket.key, size: toSize(event.currentTarget.value) });
      }}
    >
      {#each SIZES as choice (choice.value)}
        <option value={choice.value}>{choice.label}</option>
      {/each}
    </select>
  </label>
  <label class="priority">
    Échéance
    <input
      type="date"
      value={ticket.dueDate ?? ''}
      disabled={closed || ticket.origin === 'jira'}
      title={ticket.origin === 'jira' ? 'L’échéance d’un ticket Jira vient de Jira' : undefined}
      onchange={(event) => {
        const value = event.currentTarget.value;
        void tracker.act(setDueDate, { key: ticket.key, dueDate: value === '' ? null : value });
      }}
    />
  </label>
  <label class="priority">
    Priorité
    <select
      value={ticket.priority}
      disabled={closed}
      onchange={(event) => {
        const priority = toPriority(event.currentTarget.value);
        if (priority) void tracker.act(setPriority, { key: ticket.key, priority });
      }}
    >
      {#each Object.entries(PRIORITY_LABELS) as [value, label] (value)}
        <option {value}>{label}</option>
      {/each}
    </select>
  </label>
  <button
    type="button"
    aria-expanded={phaseMenuOpen}
    onclick={() => (phaseMenuOpen = !phaseMenuOpen)}
    disabled={closed}
  >
    Changer de phase
  </button>
  <button type="button" onclick={askForNews} disabled={closed}>Demander un point</button>
  <button
    type="button"
    class="close"
    class:ready={ticket.readyToClose}
    disabled={!ticket.readyToClose}
    title={ticket.readyToClose
      ? 'Déclarer le ticket terminé'
      : 'Possible après une validation en qualité faite'}
    onclick={() => tracker.act(closeTicket, { key: ticket.key })}
  >
    Déclarer terminé
  </button>
  {#if phaseMenuOpen}
    <div role="menu" aria-label="Phases" class="menu">
      {#each PHASES as phase (phase)}
        <button
          type="button"
          role="menuitem"
          class:current={phase === ticket.situation.phase}
          onclick={() => movePhase(phase)}
        >
          {phase === ticket.situation.phase ? '● ' : ''}{PHASE_LABELS[phase]}
        </button>
      {/each}
      <span class="note">Changer de phase remet l’avancement à « pas démarré ».</span>
    </div>
  {/if}
</div>

<style>
  .actions {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .actions > button {
    padding: 8px 12px;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--text);
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
  }

  .actions > button:disabled {
    border-color: var(--line);
    color: var(--muted);
    cursor: not-allowed;
  }

  .actions > .close.ready {
    border: 0;
    background: var(--blue);
    color: var(--on-blue);
    font-weight: 600;
  }

  .menu {
    position: absolute;
    top: 44px;
    left: 0;
    z-index: 5;
    min-width: 240px;
    display: flex;
    flex-direction: column;
    padding: 6px;
    background: var(--surface);
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    box-shadow: 0 10px 30px var(--shadow);
  }

  .menu button {
    padding: 9px 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--text);
    text-align: left;
    cursor: pointer;
  }

  .menu button.current,
  .menu button:hover {
    background: var(--sunken);
  }

  .note {
    padding: 6px 10px 4px;
    font-size: 11px;
    color: var(--muted);
  }

  .priority {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: var(--muted);
  }

  .priority input.group {
    width: 120px;
  }

  .priority select,
  .priority input {
    padding: 7px 8px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    font-size: 13px;
  }

  @media (max-width: 760px) {
    .actions > button,
    .priority select,
    .priority input {
      min-height: 44px;
    }
  }
</style>
