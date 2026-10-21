<script lang="ts">
  import type { Tracker } from '../lib/tracker.svelte';
  import DeliveryPanel from './DeliveryPanel.svelte';
  import UsagePanel from './UsagePanel.svelte';

  let { tracker }: { tracker: Tracker } = $props();
</script>

<main class="summary" aria-label="Bilan">
  <DeliveryPanel {tracker} />
  <UsagePanel {tracker} />
</main>

<style>
  .summary {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    padding: 24px;
    max-width: 1400px;
    width: 100%;
    box-sizing: border-box;
    margin: 0 auto;
    align-items: flex-start;
  }
</style>
