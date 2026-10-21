<script lang="ts">
  import { listNovelties, markVisited, type Novelty } from '@project-tracker/contract';
  import { shortDate } from '../lib/format';
  import { groupNovelties } from '../lib/novelties';
  import { routeHash } from '../lib/route';
  import type { Tracker } from '../lib/tracker.svelte';

  let { tracker }: { tracker: Tracker } = $props();

  let novelties: Novelty[] = $state([]);
  let since: string | null = $state(null);
  const groups = $derived(groupNovelties(novelties));

  $effect(() => {
    void reload(tracker.version);
  });

  async function reload(version: number): Promise<void> {
    const answer = await tracker.api.call(listNovelties, {});
    if (!answer.ok || version !== tracker.version) return;
    novelties = answer.value.entries;
    since = answer.value.since;
  }

  function authorOf(novelty: Novelty): string {
    if (novelty.authorKind === 'jira') return 'Jira';
    if (novelty.authorKind === 'launcher') return 'back-end';
    return novelty.author ?? 'agent';
  }
</script>

<main class="novelties" aria-label="Nouveautés">
  <div class="title-row">
    <h1>Nouveautés</h1>
    <span class="muted">
      {since === null
        ? 'Depuis le début'
        : `Depuis ta dernière visite, le ${shortDate(since, true)}`}
    </span>
    <button
      type="button"
      class="primary"
      disabled={novelties.length === 0}
      onclick={() => tracker.act(markVisited, {})}
    >
      Tout marquer vu
    </button>
  </div>
  {#each groups as group (group.key)}
    <section class="panel" aria-label={group.key}>
      <a class="ticket" href={routeHash({ view: 'list', key: group.key })}>
        <span class="key">{group.key}</span>
        {group.title}
      </a>
      {#each group.entries as novelty (novelty.id)}
        <div class="entry">
          <span class="muted">{shortDate(novelty.createdAt, true)} · {authorOf(novelty)}</span>
          <span class="body">{novelty.body}</span>
        </div>
      {/each}
    </section>
  {:else}
    <p class="muted">Rien de neuf depuis ta dernière visite.</p>
  {/each}
</main>

<style>
  .novelties {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 24px;
    max-width: 900px;
    width: 100%;
    box-sizing: border-box;
    margin: 0 auto;
  }

  .title-row {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 8px 16px;
  }

  h1 {
    margin: 0;
    font-size: 20px;
  }

  .primary {
    margin-left: auto;
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

  .ticket {
    font-weight: 600;
    color: var(--text);
    text-decoration: none;
  }

  .ticket:hover {
    text-decoration: underline;
  }

  .entry {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding-top: 10px;
    border-top: 1px solid var(--line);
  }

  .body {
    white-space: pre-line;
    line-height: 1.45;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
