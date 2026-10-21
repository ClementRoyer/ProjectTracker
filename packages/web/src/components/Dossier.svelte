<script lang="ts">
  import type { TicketDetail } from '@project-tracker/contract';
  import { shortDate } from '../lib/format';
  import { progressText } from '../lib/pilotage';
  import type { Tracker } from '../lib/tracker.svelte';
  import ChangelogLine from './ChangelogLine.svelte';
  import ManualTestForm from './ManualTestForm.svelte';

  let { tracker, ticket }: { tracker: Tracker; ticket: TicketDetail } = $props();

  const SHOWN_FILES = 8;
  let allFiles = $state(false);
  // By repository when the project names its repositories (ADR 0040).
  const sortedFiles = $derived(
    [...ticket.changedFiles].sort((a, b) => (a.repo ?? '').localeCompare(b.repo ?? '')),
  );
  const files = $derived(allFiles ? sortedFiles : sortedFiles.slice(0, SHOWN_FILES));

  const decisions = $derived(ticket.entries.filter((entry) => entry.entryType === 'decision'));
  const KINDS = ['auto', 'visual', 'user'] as const;
  // The last run of each kind (F17); the kind is in the data of the journal entry.
  const tests = $derived(
    KINDS.flatMap((kind) => {
      const runs = ticket.entries.filter(
        (entry) =>
          entry.entryType === 'testRun' &&
          typeof entry.data === 'object' &&
          entry.data !== null &&
          'kind' in entry.data &&
          entry.data.kind === kind,
      );
      const last = runs.at(-1);
      return last ? [last] : [];
    }),
  );
</script>

<aside aria-label="Ticket file" class="dossier">
  <h2>FILE</h2>
  <section>
    <h3>Initial request</h3>
    <span class="body">{ticket.initialRequest ?? ticket.title}</span>
  </section>
  <section>
    <h3>Where it stands</h3>
    <span class="body">{progressText(ticket)}</span>
  </section>
  <section>
    <h3>Decisions</h3>
    {#each decisions as decision (decision.id)}
      <span class="body">{shortDate(decision.createdAt)} · {decision.body}</span>
    {:else}
      <span class="body muted">None yet</span>
    {/each}
  </section>
  <section>
    <h3>Tests</h3>
    {#if tests.length > 0}
      {#each tests as run (run.id)}
        <span class="body" class:alert={run.body.includes('failed')}>
          {shortDate(run.createdAt, true)} · {run.body}
        </span>
      {/each}
    {:else}
      <span class="body muted">No run yet</span>
    {/if}
    {#if ticket.situation.closedAt === null}
      <ManualTestForm {tracker} ticketKey={ticket.key} />
    {/if}
  </section>
  <section>
    <h3>Changed files</h3>
    {#if ticket.overlaps.length > 0}
      <span class="body alert">In common with {ticket.overlaps.join(', ')}</span>
    {/if}
    {#each files as file, index (file.path)}
      {#if file.repo !== null && file.repo !== files[index - 1]?.repo}
        <span class="repo">{file.repo}</span>
      {/if}
      <span class="file" class:alert={file.sharedWith.length > 0}>
        {file.path}{file.sharedWith.length > 0 ? ` · also ${file.sharedWith.join(', ')}` : ''}
      </span>
    {:else}
      <span class="body muted">No file reported</span>
    {/each}
    {#if ticket.changedFiles.length > SHOWN_FILES}
      <button type="button" class="more" onclick={() => (allFiles = !allFiles)}>
        {allFiles ? 'Less' : `And ${String(ticket.changedFiles.length - SHOWN_FILES)} more`}
      </button>
    {/if}
  </section>
  {#if ticket.worktree !== null}
    <section>
      <h3>Working folder</h3>
      <span class="file">{ticket.worktree.path} · branch {ticket.worktree.branch}</span>
      {#if ticket.preview?.state === 'included'}
        <span class="body">In the preview</span>
      {:else if ticket.preview?.state === 'conflict'}
        <span class="body alert">
          Conflict with the preview: {ticket.preview.files.join(', ')}{ticket.preview.with.length >
          0
            ? ` · with ${ticket.preview.with.join(', ')}`
            : ''}
        </span>
      {/if}
      {#if ticket.situation.closedAt !== null}
        <span class="body alert">Still there: tracker worktree remove {ticket.key}</span>
      {/if}
    </section>
  {/if}
  {#if ticket.changelog !== null}
    <section>
      <h3>Changelog</h3>
      <ChangelogLine {tracker} ticketKey={ticket.key} changelog={ticket.changelog} />
    </section>
  {/if}
  {#if ticket.attachments.length > 0}
    <section>
      <h3>Attachments</h3>
      {#each ticket.attachments as file (file.id)}
        <a class="body" href={tracker.api.fileUrl(file.url)} target="_blank" rel="noreferrer">
          {file.name}
        </a>
      {/each}
    </section>
  {/if}
  {#if ticket.jiraUrl}
    <section>
      <h3>Jira</h3>
      <a class="body" href={ticket.jiraUrl} target="_blank" rel="noreferrer">Open in Jira</a>
    </section>
  {/if}
  <p class="count">Journal: {ticket.entries.length} entries</p>
</aside>

<style>
  .dossier {
    flex: 0 0 300px;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    background: var(--surface);
    border-left: 1px solid var(--line);
  }

  h2 {
    margin: 0;
    padding: 16px 18px 8px;
    font-size: 12px;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  section {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 18px;
    border-top: 1px solid var(--line);
  }

  h3 {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
  }

  .body {
    line-height: 1.45;
    overflow-wrap: anywhere;
  }

  .muted {
    color: var(--text-2);
  }

  .alert {
    color: var(--amber);
    font-weight: 600;
  }

  @media (max-width: 1099px) {
    .dossier {
      max-width: none;
      border-left: 0;
      border-top: 1px solid var(--line);
    }
  }

  .file {
    font-family: var(--mono);
    font-size: 12px;
    overflow-wrap: anywhere;
  }

  .repo {
    margin-top: 4px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text-2);
  }

  .more {
    align-self: flex-start;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--blue);
    font-size: 12px;
    cursor: pointer;
  }

  .count {
    margin: 0;
    padding: 12px 18px;
    border-top: 1px solid var(--line);
    font-size: 13px;
    color: var(--muted);
  }
</style>
