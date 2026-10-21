<script lang="ts">
  import type { Toast } from '../lib/toast.svelte';

  let { toast }: { toast: Toast } = $props();
</script>

{#if toast.text !== null}
  <div role="status" class="toast">
    <span class="text">{toast.text}</span>
    <button
      type="button"
      aria-label="Close the message"
      onclick={() => {
        toast.close();
      }}>×</button
    >
  </div>
{/if}

<style>
  .toast {
    position: fixed;
    left: 20px;
    bottom: 20px;
    z-index: 11;
    max-width: min(460px, calc(100vw - 40px));
    box-sizing: border-box;
    display: flex;
    gap: 12px;
    align-items: flex-start;
    padding: 14px 16px;
    background: var(--ink);
    color: var(--on-ink);
    border-radius: 12px;
    box-shadow: 0 12px 30px var(--shadow);
  }

  .text {
    flex: 1;
    white-space: pre-line;
    line-height: 1.45;
  }

  button {
    border: 0;
    background: transparent;
    color: var(--on-ink);
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
  }
</style>
