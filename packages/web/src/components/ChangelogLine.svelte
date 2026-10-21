<script lang="ts">
  import { acceptChangelog, type TicketDetail } from '@project-tracker/contract';
  import type { Tracker } from '../lib/tracker.svelte';

  let {
    tracker,
    ticketKey,
    changelog,
  }: {
    tracker: Tracker;
    ticketKey: string;
    changelog: NonNullable<TicketDetail['changelog']>;
  } = $props();

  let editing = $state(false);
  let draft = $state('');
  // The server shows a proposal only until it is reviewed (ADR 0037).
  const waiting = $derived(changelog.proposed !== null);
  const action = $derived.by(() => {
    if (waiting) return 'Review and accept';
    return changelog.accepted === null ? 'Write the line' : 'Edit';
  });

  function edit(): void {
    draft = (waiting ? changelog.proposed : changelog.accepted) ?? '';
    editing = true;
  }

  async function accept(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const line = draft.trim();
    if (line === '') return;
    if (await tracker.act(acceptChangelog, { key: ticketKey, line })) editing = false;
  }
</script>

{#if editing}
  <form class="edit" aria-label="Review the changelog line" onsubmit={accept}>
    <label class="visually-hidden" for="changelog-{ticketKey}">Changelog line</label>
    <textarea id="changelog-{ticketKey}" rows="2" bind:value={draft}></textarea>
    <div class="buttons">
      <button type="submit" class="save">Accept</button>
      <button type="button" class="quiet" onclick={() => (editing = false)}>Cancel</button>
    </div>
  </form>
{:else}
  {#if changelog.accepted !== null}
    <span class="line">{changelog.accepted}</span>
  {/if}
  {#if waiting}
    <span class="proposed">Proposed: {changelog.proposed}</span>
  {:else if changelog.accepted === null}
    <span class="muted">No line yet</span>
  {/if}
  <button type="button" class="link" onclick={edit}>
    {action}
  </button>
{/if}

<style>
  .line {
    line-height: 1.45;
  }

  .proposed {
    color: var(--blue);
    line-height: 1.45;
  }

  .edit {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  textarea {
    padding: 6px 8px;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
  }

  .buttons {
    display: flex;
    gap: 8px;
  }

  .save {
    padding: 6px 12px;
    border: 0;
    border-radius: 6px;
    background: var(--ink);
    color: var(--on-ink);
    font-weight: 600;
    cursor: pointer;
  }

  .quiet {
    padding: 6px 12px;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }

  .link {
    align-self: flex-start;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--blue);
    text-decoration: underline;
    font-size: 13px;
    cursor: pointer;
  }
</style>
