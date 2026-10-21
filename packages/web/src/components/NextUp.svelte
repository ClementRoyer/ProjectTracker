<script lang="ts">
  import { routeHash } from '../lib/route';

  let { suggestions }: { suggestions: { key: string; title: string; reasons: string[] }[] } =
    $props();

  let open = $state(true);
</script>

{#if suggestions.length > 0}
  <section class="next" aria-label="À prendre ensuite">
    <h2>
      <button type="button" aria-expanded={open} onclick={() => (open = !open)}>
        À PRENDRE ENSUITE <span class="count">{suggestions.length}</span>
      </button>
    </h2>
    {#if open}
      {#each suggestions as suggestion (suggestion.key)}
        <a href={routeHash({ view: 'list', key: suggestion.key })}>
          <span class="key">{suggestion.key}</span>
          <span class="title">{suggestion.title}</span>
          <span class="reasons">{suggestion.reasons.join(' · ')}</span>
        </a>
      {/each}
    {/if}
  </section>
{/if}

<style>
  .next {
    margin: 8px 12px 0;
    padding: 6px 4px 8px;
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    background: var(--surface);
  }

  h2 {
    margin: 0;
  }

  h2 button {
    width: 100%;
    padding: 6px 10px;
    border: 0;
    background: transparent;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-align: left;
    color: var(--text-2);
    cursor: pointer;
  }

  .count {
    font-weight: 500;
  }

  a {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 6px 10px;
    border-radius: 8px;
    color: var(--text);
    text-decoration: none;
  }

  a:hover {
    background: var(--surface-2);
  }

  .title {
    font-weight: 500;
  }

  .reasons {
    font-size: 12px;
    color: var(--blue);
  }
</style>
