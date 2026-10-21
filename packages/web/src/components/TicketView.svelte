<script lang="ts">
  import { getTicket, markTicketRead, type TicketDetail } from '@project-tracker/contract';
  import { groupOf, PHASES, progressText, waitText } from '../lib/pilotage';
  import { routeHash } from '../lib/route';
  import type { Tracker } from '../lib/tracker.svelte';
  import AgentRunning from './AgentRunning.svelte';
  import Composer from './Composer.svelte';
  import Discussion from './Discussion.svelte';
  import Dossier from './Dossier.svelte';
  import QuestionCard from './QuestionCard.svelte';
  import TicketActions from './TicketActions.svelte';

  let { tracker, ticketKey }: { tracker: Tracker; ticketKey: string } = $props();

  let detail: TicketDetail | null = $state(null);
  let missing = $state(false);
  let discussion: HTMLElement | undefined = $state();
  /** Files dropped on the ticket wait in the composer until the message goes (ADR 0035). */
  let pendingFiles: File[] = $state([]);

  // Like a chat: open on the latest messages, and follow new ones.
  $effect(() => {
    const count = (detail?.entries.length ?? 0) + (detail?.openQuestions.length ?? 0);
    if (count > 0) discussion?.lastElementChild?.scrollIntoView({ block: 'end' });
  });

  // Reloads at each change the server signals; a late answer for an older state is dropped.
  $effect(() => {
    void load(ticketKey, tracker.version);
  });

  async function load(key: string, version: number): Promise<void> {
    const answer = await tracker.api.call(getTicket, { key });
    if (key !== ticketKey || version !== tracker.version) return;
    missing = !answer.ok;
    detail = answer.ok ? answer.value : null;
    // Reading the ticket clears its unread mark, and only its own (ADR 0029).
    if (answer.ok && answer.value.unread) await tracker.api.call(markTicketRead, { key });
  }

  const SHORT = ['À faire', 'Analyse', 'Dév.', 'Test', 'Livr. qualité', 'Valid. qualité'];

  function assigneesText(ticket: TicketDetail): string {
    if (ticket.assignees.length === 0) return 'aucun intervenant';
    return ticket.assignees
      .map((a) => `${a.role === 'front' ? 'front' : 'back-end'} : ${a.name ?? 'toi'}`)
      .join(' · ');
  }
</script>

{#if missing}
  <p class="hint">Ce ticket n’existe pas.</p>
{:else if detail}
  {@const ticket = detail}
  {@const phaseIndex = PHASES.indexOf(ticket.situation.phase)}
  {@const closed = ticket.situation.closedAt !== null}
  <div class="ticket">
    <main
      class="center"
      aria-label="Ticket {ticket.key}"
      ondragover={(event) => {
        event.preventDefault();
      }}
      ondrop={(event) => {
        event.preventDefault();
        pendingFiles = [...pendingFiles, ...(event.dataTransfer?.files ?? [])];
      }}
    >
      <a class="back" href={routeHash({ view: 'list', key: null })}>← Tickets</a>
      <div class="head">
        <div class="titles">
          <span class="origin">
            <span class="key">{ticket.key}</span> ·
            {ticket.origin === 'jira' ? `Jira · ${ticket.jiraStatus ?? ''}` : 'Local'}
          </span>
          <h1>{ticket.title}</h1>
        </div>
        <TicketActions {tracker} {ticket} />
      </div>
      <ol aria-label="Phase" class="strip">
        {#each SHORT as label, index (label)}
          <li
            class:done={index < phaseIndex}
            class:now={index === phaseIndex}
            class:later={index > phaseIndex}
          >
            {label}
          </li>
        {/each}
      </ol>
      <div class="badges">
        {#if ticket.working}<AgentRunning />{/if}
        <span class="pill big wait-{groupOf(ticket)}">{waitText(ticket, tracker.now)}</span>
        <span class="badge">{progressText(ticket)}</span>
        <span class="badge">{assigneesText(ticket)}</span>
      </div>

      <section aria-label="Discussion" class="discussion" bind:this={discussion}>
        <Discussion
          entries={ticket.entries}
          attachments={ticket.attachments}
          fileUrl={tracker.api.fileUrl}
          openQuestionIds={ticket.openQuestions.map((question) => question.questionId)}
        />
        {#each ticket.openQuestions as question (question.questionId)}
          <QuestionCard {tracker} {question} now={tracker.now} />
        {/each}
      </section>

      {#if !closed}
        <Composer bind:pending={pendingFiles} {tracker} ticketKey={ticket.key} />
      {/if}
    </main>

    <Dossier {tracker} {ticket} />
  </div>
{/if}

<style>
  .ticket {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
  }

  .center {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--surface);
  }

  /* Medium screens: the ticket and its folder scroll together, the composer stays at the bottom. */
  @media (max-width: 1099px) {
    .ticket {
      display: block;
      overflow-y: auto;
    }

    .center {
      min-height: auto;
    }

    .discussion {
      overflow: visible;
    }

    /* The composer stays over the bottom of the discussion: keep the last message above it. */
    .discussion > :global(*) {
      scroll-margin-bottom: 160px;
    }
  }

  @media (max-width: 760px) {
    .ticket {
      overflow: visible;
    }
  }

  .hint {
    padding: 24px;
    color: var(--muted);
  }

  .back {
    display: none;
  }

  @media (max-width: 760px) {
    .back {
      display: inline-flex;
      align-items: center;
      min-height: 44px;
      padding: 0 16px;
      color: var(--text);
      font-weight: 600;
      text-decoration: none;
    }

    .head,
    .badges,
    .discussion {
      padding-left: 16px;
      padding-right: 16px;
    }

    .head {
      padding-top: 0;
    }

    .strip {
      margin: 10px 16px 0;
    }

    .strip li {
      font-size: 10px;
      padding: 6px 2px;
    }
  }

  .head {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 16px;
    align-items: flex-start;
    justify-content: space-between;
    padding: 16px 24px 0;
  }

  .titles {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }

  .origin {
    font-size: 12px;
    color: var(--muted);
  }

  h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    line-height: 1.25;
  }

  .strip {
    margin: 10px 24px 0;
    padding: 0;
    list-style: none;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 4px;
  }

  .strip li {
    padding: 6px 4px;
    font-size: 12px;
    text-align: center;
    border-radius: 6px;
  }

  .strip .done {
    background: var(--sunken);
    color: var(--text-2);
  }

  .strip .now {
    background: var(--ink);
    color: var(--on-ink);
    font-weight: 600;
  }

  .strip .later {
    color: var(--muted);
    border: 1px solid var(--line);
  }

  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    padding: 10px 24px 16px;
    border-bottom: 1px solid var(--line);
  }

  .pill.big {
    font-size: 13px;
    padding: 4px 10px;
  }

  .badge {
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--sunken);
    font-size: 13px;
  }

  .discussion {
    position: relative;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 18px 24px;
    background: var(--surface-2);
  }
</style>
