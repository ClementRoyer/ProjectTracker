<script lang="ts">
  import { readDocument } from '@project-tracker/contract';
  import type { Tracker } from '../lib/tracker.svelte';

  let { tracker }: { tracker: Tracker } = $props();

  let chosen: string | null = $state(null);
  let content: string | null = $state(null);

  async function open(path: string): Promise<void> {
    chosen = path;
    content = null;
    const answer = await tracker.act(readDocument, { path });
    if (answer && chosen === path) content = answer.content;
  }
</script>

<main class="documents" aria-label="Documents">
  <nav aria-label="Project documents" class="list">
    <h1>Documents</h1>
    {#each tracker.documents as path (path)}
      <button
        type="button"
        aria-current={path === chosen ? 'true' : undefined}
        onclick={() => open(path)}
      >
        {path}
      </button>
    {/each}
  </nav>
  <article class="panel content" aria-label={chosen ?? 'No document'}>
    {#if chosen === null}
      <span class="muted">Pick a document.</span>
    {:else}
      <h2>{chosen}</h2>
      <pre>{content ?? '…'}</pre>
    {/if}
  </article>
</main>

<style>
  .documents {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
    box-sizing: border-box;
    width: 100%;
    align-items: flex-start;
  }

  .list {
    flex: 0 1 280px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  h1 {
    margin: 0 0 8px;
    font-size: 20px;
  }

  .list button {
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font-family: var(--mono);
    font-size: 12px;
    text-align: left;
    cursor: pointer;
    overflow-wrap: anywhere;
  }

  .list button[aria-current='true'] {
    background: var(--surface);
    border-color: var(--text);
  }

  .content {
    flex: 1 1 480px;
    min-width: 0;
  }

  pre {
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-family: var(--sans);
    line-height: 1.5;
  }
</style>
