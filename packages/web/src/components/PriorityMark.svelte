<script lang="ts">
  import type { TicketSummary } from '@project-tracker/contract';
  import { PRIORITY_LABELS } from '../lib/pilotage';

  let { priority }: { priority: TicketSummary['priority'] } = $props();
</script>

<!-- Discreet: a normal ticket shows nothing (ADR 0032). -->
{#if priority !== 'normal'}
  <span class="mark {priority}">{PRIORITY_LABELS[priority]}</span>
{/if}

<style>
  .mark {
    flex: none;
    padding: 0 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 600;
    line-height: 18px;
  }

  .urgent {
    background: var(--amber);
    color: var(--surface);
  }

  .high {
    background: var(--amber-soft);
    color: var(--amber);
  }

  .low {
    border: 1px solid var(--line-strong);
    color: var(--muted);
  }
</style>
