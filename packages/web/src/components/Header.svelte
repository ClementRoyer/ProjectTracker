<script lang="ts">
  import { createTicket, loadFromJira } from '@project-tracker/contract';
  import { onMount } from 'svelte';
  import { routeHash, type Route } from '../lib/route';
  import type { Theme } from '../lib/theme';
  import type { Tracker } from '../lib/tracker.svelte';
  import { mayAskToNotify } from '../lib/notifier';
  import { ago } from '../lib/format';
  import { costText, tokensText } from '../lib/usage';

  let {
    tracker,
    route,
    theme,
    onToggleTheme,
  }: { tracker: Tracker; route: Route; theme: Theme; onToggleTheme: () => void } = $props();

  let newTitle = $state('');
  let loading = $state(false);
  let askToNotify = $state(mayAskToNotify());
  const SCREEN_NAMES = {
    summary: 'Summary',
    novelties: 'Novelties',
    documents: 'Documents',
  } as const;
  let projects: { name: string; url: string; current: boolean }[] = $state([]);

  onMount(() => {
    void tracker.api.projects().then((found) => {
      projects = found;
    });
  });

  async function enableNotifications(): Promise<void> {
    await Notification.requestPermission();
    askToNotify = mayAskToNotify();
  }

  async function create(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const title = newTitle.trim();
    if (title === '') return;
    const created = await tracker.act(createTicket, { title });
    if (!created) return;
    newTitle = '';
    tracker.toast.show(`${created.key} created, locally: nothing is sent to Jira.`);
    location.hash = routeHash({ view: 'list', key: created.key });
  }

  async function loadJira(): Promise<void> {
    loading = true;
    const loaded = await tracker.act(loadFromJira, {});
    loading = false;
    if (!loaded) return;
    const list = (keys: string[]): string => (keys.length > 0 ? ` : ${keys.join(', ')}` : '');
    tracker.toast.show(
      [
        `Jira import done · ${String(loaded.read)} tickets read`,
        `${String(loaded.created.length)} new${list(loaded.created)} · ${String(loaded.changed.length)} changed${list(loaded.changed)}`,
        ...(loaded.notAssigned.length > 0
          ? [`No longer assigned to you${list(loaded.notAssigned)}`]
          : []),
        'Nothing was written to Jira.',
      ].join('\n'),
    );
  }

  function previewParts(
    preview: NonNullable<Tracker['preview']>,
    now: string,
  ): { count: string; when: string; conflicts: string } {
    const count = preview.included.length;
    const elapsed = ago(preview.builtAt, now);
    const conflicts = preview.conflicts.length;
    return {
      count: `Preview: ${String(count)} ticket${count > 1 ? 's' : ''}`,
      when: elapsed === 'now' ? 'just now' : `${elapsed} ago`,
      conflicts: conflicts > 0 ? `${String(conflicts)} conflict${conflicts > 1 ? 's' : ''}` : '',
    };
  }

  const modes = [
    { label: 'List', route: { view: 'list', key: null } },
    { label: 'Board', route: { view: 'board' } },
  ] as const;
</script>

<header>
  <strong class="brand">project-tracker</strong>
  {#if projects.length > 1}
    <label class="project">
      <select
        aria-label="Project"
        value={projects.find((project) => project.current)?.url ?? ''}
        onchange={(event) => {
          location.href = event.currentTarget.value;
        }}
      >
        {#each projects as project (project.url)}
          <option value={project.url}>{project.name}</option>
        {/each}
      </select>
    </label>
  {/if}
  {#if route.view === 'summary' || route.view === 'novelties' || route.view === 'documents'}
    <a class="link" href={routeHash({ view: 'list', key: null })}>← Cockpit</a>
    <span class="current">{SCREEN_NAMES[route.view]}</span>
  {:else}
    <nav aria-label="View" class="modes">
      {#each modes as mode (mode.label)}
        <a
          href={routeHash(mode.route)}
          aria-current={route.view === mode.route.view ? 'page' : undefined}>{mode.label}</a
        >
      {/each}
    </nav>
    <a class="link" href={routeHash({ view: 'summary' })}>Summary</a>
    {#if tracker.groups.length > 0}
      <label class="project">
        <select
          aria-label="Group"
          value={tracker.groupFilter ?? ''}
          onchange={(event) => {
            tracker.groupFilter =
              event.currentTarget.value === '' ? null : event.currentTarget.value;
          }}
        >
          <option value="">All groups</option>
          {#each tracker.groups as group (group)}
            <option value={group}>{group}</option>
          {/each}
        </select>
      </label>
    {/if}
  {/if}
  {#if route.view !== 'documents' && tracker.documents.length > 0}
    <a class="link" href={routeHash({ view: 'documents' })}>Documents</a>
  {/if}
  {#if route.view !== 'novelties'}
    <a class="link" href={routeHash({ view: 'novelties' })}>
      Novelties{tracker.novelties.length > 0 ? ` (${String(tracker.novelties.length)})` : ''}
    </a>
  {/if}
  {#if route.view === 'list' || route.view === 'board'}
    <form class="create" onsubmit={create}>
      <label for="newTicket" class="visually-hidden">New local ticket</label>
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        aria-hidden="true"
      >
        <path d="M3 8h10M8 3v10"></path>
      </svg>
      <input id="newTicket" bind:value={newTitle} placeholder="New ticket in one sentence" />
      <button type="submit">Create</button>
    </form>
    <button type="button" class="jira" onclick={loadJira} disabled={loading}>
      {loading ? 'Loading…' : 'Load Jira'}
    </button>
  {:else}
    <span class="spacer"></span>
  {/if}
  {#if askToNotify}
    <button type="button" class="jira" onclick={enableNotifications}>Enable notifications</button>
  {/if}
  {#if tracker.preview}
    {@const parts = previewParts(tracker.preview, tracker.now)}
    <span
      role="status"
      aria-label="Preview"
      class="preview"
      class:conflict={parts.conflicts !== ''}
      title="Rebuilt {parts.when} by 'tracker preview build', served from .worktrees/preview"
      >{parts.count}<span class="when">{` · ${parts.when}`}</span>{parts.conflicts === ''
        ? ''
        : ` · ${parts.conflicts}`}</span
    >
  {/if}
  <span class="usage">
    AI today: {tokensText(tracker.usageToday.tokens)} tokens · estimated cost {costText(
      tracker.usageToday.cost,
      tracker.usageToday.currency,
    )}
  </span>
  <button
    type="button"
    class="theme"
    aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
    onclick={onToggleTheme}
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="3.2"></circle>
      <path
        d="M8 1.5v1.8M8 12.7v1.8M1.5 8h1.8M12.7 8h1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3"
      ></path>
    </svg>
  </button>
</header>

<style>
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 16px;
    padding: 10px 20px;
    background: var(--head);
    color: var(--head-text);
  }

  .brand {
    font-size: 15px;
    letter-spacing: 0.01em;
  }

  .project select {
    padding: 6px 8px;
    border: 1px solid var(--head-muted);
    border-radius: 6px;
    background: var(--head-2);
    color: var(--head-text);
    font-size: 13px;
  }

  .modes {
    display: flex;
    gap: 2px;
    padding: 3px;
    background: var(--head-2);
    border-radius: 8px;
  }

  .modes a {
    padding: 7px 12px;
    border-radius: 6px;
    font-size: 13px;
    color: var(--head-text);
    text-decoration: none;
  }

  .modes a[aria-current='page'] {
    background: var(--head-text);
    color: var(--head);
    font-weight: 600;
  }

  .link {
    color: var(--head-text);
    font-size: 13px;
  }

  .current {
    font-size: 13px;
    font-weight: 600;
  }

  .spacer {
    flex: 1;
  }

  .create {
    flex: 1 1 180px;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 6px 0 12px;
    background: var(--head-2);
    border-radius: 8px;
    color: var(--head-muted);
  }

  .create input {
    flex: 1;
    min-width: 0;
    padding: 10px 0;
    border: 0;
    background: transparent;
    color: var(--head-text);
  }

  .create input::placeholder {
    color: var(--head-muted);
  }

  .create button {
    padding: 6px 10px;
    border: 0;
    border-radius: 6px;
    background: var(--head);
    color: var(--head-text);
    font-size: 13px;
    cursor: pointer;
  }

  .jira {
    padding: 9px 12px;
    border: 1px solid var(--head-muted);
    background: transparent;
    color: var(--head-text);
    border-radius: 8px;
    font-size: 13px;
    cursor: pointer;
  }

  .usage {
    font-size: 12px;
    color: var(--head-muted);
  }

  .preview {
    padding: 2px 8px;
    border: 1px solid var(--head-2);
    border-radius: 999px;
    font-size: 12px;
    color: var(--head-muted);
  }

  /* The time of the build gives way first on narrower screens; it stays in the tooltip. */
  @media (max-width: 1399px) {
    .when {
      display: none;
    }
  }

  .preview.conflict {
    border-color: var(--amber-soft);
    background: var(--amber-soft);
    color: var(--amber);
    font-weight: 600;
  }

  @media (max-width: 760px) {
    header {
      padding: 10px 16px;
    }

    .create {
      order: 10;
      flex-basis: 100%;
    }

    .usage {
      display: none;
    }

    .modes a,
    .jira,
    .create button {
      min-height: 44px;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
    }
  }

  .theme {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--head-muted);
    background: transparent;
    color: var(--head-text);
    border-radius: 8px;
    cursor: pointer;
  }
</style>
