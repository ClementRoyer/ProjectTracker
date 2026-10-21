<script lang="ts">
  import { closeTicket, type WaitingItem } from '@project-tracker/contract';
  import { onMount } from 'svelte';
  import { ago } from '../lib/format';
  import { routeHash } from '../lib/route';
  import type { Tracker } from '../lib/tracker.svelte';
  import { itemId, triageQueue } from '../lib/triage';
  import QuestionCard from './QuestionCard.svelte';

  let { tracker, onClose }: { tracker: Tracker; onClose: () => void } = $props();

  let dialog: HTMLDialogElement | undefined = $state();
  let later: string[] = $state([]);
  let handled = $state(0);

  const queue = $derived(triageQueue(tracker.waiting, later));
  const current: WaitingItem | undefined = $derived(queue[0]);
  const total = $derived(handled + queue.length);

  onMount(() => {
    dialog?.showModal();
  });

  function putOff(item: WaitingItem): void {
    const id = itemId(item);
    later = [...later.filter((other) => other !== id), id];
  }

  async function close(item: WaitingItem): Promise<void> {
    const closed = await tracker.act(closeTicket, { key: item.key });
    if (closed) handled += 1;
  }

  function open(item: WaitingItem): void {
    location.hash = routeHash({ view: 'list', key: item.key });
    onClose();
  }
</script>

<dialog bind:this={dialog} aria-label="Triage" onclose={onClose}>
  <div class="top">
    <span class="progress">
      {current ? `${String(handled + 1)} of ${String(total)}` : 'All done'}
      <span class="dots" aria-hidden="true">
        {#each { length: total } as _, index (index)}
          <span class="dot" class:past={index < handled} class:now={index === handled}></span>
        {/each}
      </span>
    </span>
    <button type="button" class="quiet" onclick={() => dialog?.close()}>Close</button>
  </div>

  {#if current}
    {@const item = current}
    <div class="item">
      <span class="where">
        <span class="key">{item.key}</span> · {item.title} ·
        <b
          >{item.kind === 'question' ? 'Question' : 'Action for you'} · {ago(
            item.since,
            tracker.now,
          )}</b
        >
      </span>
      {#if item.kind === 'question' && item.questionId !== null}
        {#key item.questionId}
          <QuestionCard
            {tracker}
            now={tracker.now}
            question={{
              questionId: item.questionId,
              text: item.text,
              askedAt: item.since,
              context: item.question?.context ?? null,
              options: item.question?.options ?? [],
              recommendation: item.question?.recommendation ?? null,
              author: item.question?.author ?? null,
              role: item.question?.role ?? null,
            }}
            onAnswered={() => (handled += 1)}
          />
        {/key}
      {:else}
        <h2>{item.text}</h2>
        <div class="choices">
          <button type="button" class="recommended" onclick={() => close(item)}>
            <b>Close ticket</b><span>The ticket is closed; it stays in the summary.</span>
          </button>
          <button
            type="button"
            onclick={() => {
              putOff(item);
            }}
          >
            <b>Not yet</b><span>It stays in QA validation.</span>
          </button>
        </div>
      {/if}
      <div class="after">
        <button
          type="button"
          class="quiet"
          onclick={() => {
            putOff(item);
          }}>Later</button
        >
        <button
          type="button"
          class="link"
          onclick={() => {
            open(item);
          }}>Open the discussion</button
        >
      </div>
    </div>
  {:else}
    <div class="done">
      <h2>Nothing is waiting for you.</h2>
      <span>The agents carry on with your answers.</span>
    </div>
  {/if}
</dialog>

<style>
  dialog {
    width: min(740px, calc(100vw - 32px));
    box-sizing: border-box;
    margin-top: 64px;
    padding: 26px 30px;
    border: 0;
    border-radius: 16px;
    background: var(--surface);
    color: var(--text);
    box-shadow: 0 24px 60px var(--shadow);
  }

  dialog::backdrop {
    background: var(--scrim);
  }

  .top {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    margin-bottom: 16px;
  }

  .progress {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13px;
    color: var(--text-2);
  }

  .dots {
    display: flex;
    gap: 5px;
  }

  .dot {
    width: 26px;
    height: 5px;
    border-radius: 3px;
    background: var(--track);
  }

  .dot.past {
    background: var(--text);
  }

  .dot.now {
    background: var(--blue);
  }

  .item {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .where {
    font-size: 13px;
    color: var(--muted);
  }

  .where b {
    color: var(--blue);
  }

  h2 {
    margin: 0;
    font-size: 24px;
    line-height: 1.3;
  }

  .choices {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  .choices button {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
    padding: 13px 15px;
    border-radius: 10px;
    text-align: left;
    color: var(--text);
    cursor: pointer;
    border: 1px solid var(--line-strong);
    background: var(--surface);
  }

  .choices button.recommended {
    border: 2px solid var(--blue);
    background: var(--blue-soft);
  }

  .choices span {
    font-size: 13px;
    color: var(--text-2);
  }

  .after {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .quiet {
    padding: 9px 14px;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--text);
    border-radius: 8px;
    cursor: pointer;
  }

  .link {
    padding: 9px 4px;
    border: 0;
    background: transparent;
    color: var(--blue);
    text-decoration: underline;
    cursor: pointer;
  }

  .done {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
    padding: 18px 0;
    text-align: center;
  }
</style>
