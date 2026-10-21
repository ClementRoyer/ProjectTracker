<script lang="ts">
  import {
    deliverBatch,
    listBatches,
    listWorktrees,
    validateBatch,
    type DeliveryBatchView,
  } from '@project-tracker/contract';
  import { currentInstant, shortDate } from '../lib/format';
  import { deliveryCandidates, recentlyClosed } from '../lib/summary';
  import type { Tracker } from '../lib/tracker.svelte';

  let { tracker }: { tracker: Tracker } = $props();

  let batches: DeliveryBatchView[] = $state([]);
  let unchecked: string[] = $state([]);
  let batchName = $state(`Delivery of ${shortDate(currentInstant())}`);
  let delivered: string | null = $state(null);
  /** The tickets with a working folder: their branches are merged by the CLI, not the page (ADR 0044). */
  let withFolder: string[] = $state([]);

  const candidates = $derived(deliveryCandidates(tracker.tickets));
  const chosen = $derived(candidates.filter((ticket) => !unchecked.includes(ticket.key)));
  const closed = $derived(recentlyClosed(tracker.tickets).slice(0, 10));
  const hasBranches = $derived(chosen.some((ticket) => withFolder.includes(ticket.key)));
  const command = $derived(
    `node tools/tracker/app/tracker.js deliver "${(batchName.trim() || 'Delivery').replaceAll('"', '\\"')}" ${chosen.map((ticket) => ticket.key).join(' ')}`,
  );

  $effect(() => {
    void reload(tracker.version);
  });

  async function reload(version: number): Promise<void> {
    const [listed, folders] = await Promise.all([
      tracker.api.call(listBatches, {}),
      tracker.api.call(listWorktrees, {}),
    ]);
    if (version !== tracker.version) return;
    if (listed.ok) batches = listed.value.batches;
    if (folders.ok) withFolder = folders.value.worktrees.map((folder) => folder.key);
  }

  function toggle(key: string): void {
    unchecked = unchecked.includes(key) ? unchecked.filter((k) => k !== key) : [...unchecked, key];
  }

  async function deliver(): Promise<void> {
    const batch = await tracker.act(deliverBatch, {
      name: batchName.trim() || 'Delivery',
      keys: chosen.map((ticket) => ticket.key),
    });
    if (batch) {
      const changelog = batch.changelog
        ? ` Changelog: ${String(batch.changelog.written)} lines added${batch.changelog.missing.length > 0 ? `; without an accepted line: ${batch.changelog.missing.join(', ')}` : ''}.`
        : '';
      delivered = `Delivery recorded: ${String(batch.keys.length)} tickets move to "QA delivery". You will validate it once the end user has tested.${changelog}`;
    }
  }

  async function validate(batchId: string): Promise<void> {
    await tracker.act(validateBatch, { batchId });
  }
</script>

<div class="column">
  <section class="panel" aria-label="Next QA delivery">
    <div class="title-row">
      <h1>Next QA delivery</h1>
      <span class="muted">{chosen.length} ready: tests done</span>
    </div>
    {#each candidates as ticket (ticket.key)}
      <label class="ready">
        <input
          type="checkbox"
          checked={!unchecked.includes(ticket.key)}
          onchange={() => {
            toggle(ticket.key);
          }}
        />
        <span class="key">{ticket.key}</span>
        <span class="grow">{ticket.title}</span>
      </label>
    {:else}
      <span class="muted">No ticket in test with its tests done.</span>
    {/each}
    <div class="deliver">
      <label for="batch" class="muted">Delivery name</label>
      <input id="batch" bind:value={batchName} />
      {#if !hasBranches}
        <button type="button" class="primary" disabled={chosen.length === 0} onclick={deliver}>
          Record as delivered to QA
        </button>
      {/if}
    </div>
    {#if hasBranches}
      <span class="muted"
        >Some tickets have a branch to merge. Run this in the project: their branches go into the
        base, one commit per ticket, then the delivery is recorded. Nothing is pushed.</span
      >
      <code aria-label="Delivery command">{command}</code>
    {/if}
    {#if delivered}<span role="status" class="muted">{delivered}</span>{/if}
  </section>

  <section class="panel" aria-label="Past deliveries">
    <h2>Past deliveries</h2>
    {#each batches as batch (batch.id)}
      <div class="batch">
        <b>{batch.name}</b>
        <span class="keys">{batch.keys.join(' · ')}</span>
        {#if batch.validatedAt}
          <span>validated on {shortDate(batch.validatedAt)}</span>
        {:else}
          <span class="to-validate">to validate</span>
          <button type="button" class="quiet" onclick={() => validate(batch.id)}>
            Record as validated
          </button>
        {/if}
      </div>
    {:else}
      <span class="muted">No delivery yet.</span>
    {/each}
  </section>

  <section class="panel" aria-label="Recently closed">
    <h2>Recently closed</h2>
    {#each closed as ticket (ticket.key)}
      <span>
        <span class="key">{ticket.key}</span>
        {ticket.title} · closed on {shortDate(ticket.situation.closedAt ?? '')}
      </span>
    {:else}
      <span class="muted">No closed ticket.</span>
    {/each}
  </section>
</div>

<style>
  .column {
    flex: 1 1 520px;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .title-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    flex-wrap: wrap;
  }

  .ready {
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 10px 0;
    border-top: 1px solid var(--line);
  }

  .ready input {
    width: 18px;
    height: 18px;
    accent-color: var(--blue);
  }

  .grow {
    flex: 1;
  }

  .deliver {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  .deliver input {
    flex: 1 1 180px;
    padding: 8px 10px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
  }

  code {
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--surface-2);
    border: 1px solid var(--line);
    font-family: var(--mono);
    font-size: 12px;
    overflow-wrap: anywhere;
    user-select: all;
  }

  .primary {
    padding: 9px 14px;
    border: 0;
    border-radius: 8px;
    background: var(--ink);
    color: var(--on-ink);
    font-weight: 600;
    cursor: pointer;
  }

  .primary:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .batch {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    align-items: center;
    padding: 10px 0;
    border-top: 1px solid var(--line);
  }

  .keys {
    flex: 1;
    font-family: var(--mono);
    font-size: 12px;
  }

  .to-validate {
    color: var(--amber);
    font-weight: 600;
    font-size: 13px;
  }

  .quiet {
    padding: 6px 10px;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--text);
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
  }
</style>
