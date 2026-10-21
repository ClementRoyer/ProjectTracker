<script lang="ts">
  import { onMount } from 'svelte';
  import Board from './components/Board.svelte';
  import Documents from './components/Documents.svelte';
  import Header from './components/Header.svelte';
  import NextUp from './components/NextUp.svelte';
  import Novelties from './components/Novelties.svelte';
  import Summary from './components/Summary.svelte';
  import TicketList from './components/TicketList.svelte';
  import TicketView from './components/TicketView.svelte';
  import Triage from './components/Triage.svelte';
  import ToastMessage from './components/ToastMessage.svelte';
  import { parseRoute, type Route } from './lib/route';
  import { Notifier } from './lib/notifier';
  import { applyTheme, initialTheme, saveTheme, type Theme } from './lib/theme';
  import type { Tracker } from './lib/tracker.svelte';

  let { tracker }: { tracker: Tracker } = $props();

  let route: Route = $state(parseRoute(location.hash));
  let theme: Theme = $state(initialTheme());
  let triageOpen = $state(false);

  onMount(() => {
    const onHash = (): void => {
      route = parseRoute(location.hash);
    };
    addEventListener('hashchange', onHash);
    const stop = tracker.start();
    return () => {
      removeEventListener('hashchange', onHash);
      stop();
    };
  });

  $effect(() => {
    applyTheme(theme);
  });

  const notifier = new Notifier();
  $effect(() => {
    if (tracker.version > 0) notifier.update(tracker.waiting, tracker.novelties);
  });
</script>

<div class="page">
  <Header
    {tracker}
    {route}
    {theme}
    onToggleTheme={() => {
      theme = theme === 'dark' ? 'light' : 'dark';
      saveTheme(theme);
    }}
  />

  {#if route.view === 'list'}
    <div class="pilotage" class:has-ticket={route.key !== null}>
      <aside aria-label="Tickets" class="rail">
        <TicketList
          tickets={tracker.shownTickets}
          now={tracker.now}
          selectedKey={route.key}
          waitingCount={tracker.waiting.length}
          onTriage={() => (triageOpen = true)}
        >
          <NextUp suggestions={tracker.suggestions} />
        </TicketList>
      </aside>
      <div class="ticket">
        {#if route.key === null}
          <p class="hint">Pick a ticket in the list.</p>
        {:else}
          <TicketView {tracker} ticketKey={route.key} />
        {/if}
      </div>
    </div>
  {/if}
  {#if route.view === 'board'}
    <div class="scroll"><Board tickets={tracker.shownTickets} now={tracker.now} /></div>
  {/if}
  {#if route.view === 'documents'}
    <div class="scroll"><Documents {tracker} /></div>
  {/if}
  {#if route.view === 'novelties'}
    <div class="scroll"><Novelties {tracker} /></div>
  {/if}
  {#if route.view === 'summary'}
    <div class="scroll"><Summary {tracker} /></div>
  {/if}
  {#if triageOpen}
    <Triage {tracker} onClose={() => (triageOpen = false)} />
  {/if}
  <ToastMessage toast={tracker.toast} />
</div>

<style>
  /* One screen, like the validated mockup: the header stays, each part scrolls by itself. */
  .page {
    height: 100vh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .scroll {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .pilotage {
    flex: 1;
    min-height: 0;
    display: flex;
  }

  .rail {
    flex: 0 0 340px;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    background: var(--rail);
    border-right: 1px solid var(--line);
  }

  .ticket {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    background: var(--surface);
  }

  .hint {
    padding: 24px;
    color: var(--muted);
  }

  /* Phone (validated mockup): the list, or one ticket full screen, and the page scrolls. */
  @media (max-width: 760px) {
    .page {
      height: auto;
      min-height: 100dvh;
    }

    .pilotage {
      display: block;
    }

    .rail {
      overflow: visible;
      border-right: 0;
    }

    .scroll {
      overflow: visible;
    }

    .pilotage.has-ticket .rail,
    .pilotage:not(.has-ticket) .ticket {
      display: none;
    }
  }
</style>
