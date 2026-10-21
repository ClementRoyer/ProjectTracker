<script lang="ts">
  import { sendMessage } from '@project-tracker/contract';
  import { refusalText } from '../lib/messages';
  import type { Tracker } from '../lib/tracker.svelte';

  let {
    tracker,
    ticketKey,
    pending = $bindable([]),
  }: { tracker: Tracker; ticketKey: string; pending?: File[] } = $props();

  let to: 'front' | 'backend' = $state('front');
  let draft = $state('');
  let picker: HTMLInputElement | undefined = $state();

  const recipients = [
    { id: 'front', label: 'front · current assignee' },
    { id: 'backend', label: 'back-end · via the launcher' },
  ] as const;

  /** Files picked, pasted or dropped on the ticket wait here until the message goes. */
  function addFiles(files: Iterable<File>): void {
    pending = [...pending, ...files];
  }

  function paste(event: ClipboardEvent): void {
    const files = [...(event.clipboardData?.files ?? [])];
    if (files.length === 0) return;
    event.preventDefault();
    addFiles(files);
  }

  async function uploadAll(): Promise<string[] | null> {
    const ids: string[] = [];
    for (const file of pending) {
      const answer = await tracker.api.upload(ticketKey, file);
      if (!answer.ok) {
        tracker.toast.show(`${file.name || 'screenshot'}: ${refusalText(answer.error)}`);
        return null;
      }
      ids.push(answer.value.id);
    }
    return ids;
  }

  async function send(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const names = pending.map((file) => file.name || 'capture.png');
    const body = draft.trim() || (names.length > 0 ? `Attachment: ${names.join(', ')}` : '');
    if (body === '') return;
    const attachments = await uploadAll();
    if (attachments === null) return;
    const sent = await tracker.act(sendMessage, { key: ticketKey, to, body, attachments });
    if (sent) {
      draft = '';
      pending = [];
    }
  }
</script>

<form class="composer" onsubmit={send}>
  <div class="to" role="group" aria-label="Recipient">
    <span class="label">To</span>
    {#each recipients as recipient (recipient.id)}
      <button type="button" aria-pressed={to === recipient.id} onclick={() => (to = recipient.id)}>
        {recipient.label}
      </button>
    {/each}
    <span class="spacer"></span>
    <button type="button" class="attach" onclick={() => picker?.click()}>Attach a screenshot</button
    >
    <input
      bind:this={picker}
      class="visually-hidden"
      type="file"
      multiple
      aria-label="Files to attach"
      onchange={(event) => {
        addFiles(event.currentTarget.files ?? []);
        event.currentTarget.value = '';
      }}
    />
  </div>
  {#if pending.length > 0}
    <ul class="pending" aria-label="Files to attach">
      {#each pending as file, index (index)}
        <li>
          {file.name || 'capture.png'}
          <button
            type="button"
            aria-label="Remove {file.name || 'the screenshot'}"
            onclick={() => (pending = pending.filter((_, other) => other !== index))}>×</button
          >
        </li>
      {/each}
    </ul>
  {/if}
  <div class="write">
    <label class="visually-hidden" for="composer">Message</label>
    <textarea
      id="composer"
      rows="2"
      bind:value={draft}
      onpaste={paste}
      placeholder="An instruction, some feedback, a piece of info… The assignee gets it without you opening their conversation."
    ></textarea>
    <button type="submit" class="send">Send</button>
  </div>
</form>

<style>
  .composer {
    position: sticky;
    bottom: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 24px 16px;
    border-top: 1px solid var(--line);
    background: var(--surface);
  }

  .to {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  .label {
    font-size: 12px;
    color: var(--muted);
  }

  .to button {
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 13px;
    cursor: pointer;
    background: var(--surface);
    color: var(--text);
    border: 1px solid var(--line-strong);
  }

  .to button[aria-pressed='true'] {
    background: var(--ink);
    color: var(--on-ink);
    border-color: var(--ink);
  }

  .write {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  textarea {
    flex: 1;
    min-width: 0;
    padding: 10px 12px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    resize: vertical;
  }

  @media (max-width: 760px) {
    .composer {
      padding: 12px 16px 16px;
    }

    .to button,
    .spacer {
      flex: 1;
    }

    .to .attach {
      padding: 6px 10px;
      border: 1px solid var(--line-strong);
      background: var(--surface);
      color: var(--text);
      border-radius: 6px;
      font-size: 13px;
      cursor: pointer;
    }

    .pending {
      margin: 0;
      padding: 0;
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .pending li {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 4px 3px 10px;
      border-radius: 999px;
      background: var(--sunken);
      font-size: 12px;
    }

    .pending button {
      border: 0;
      background: transparent;
      color: var(--muted);
      font-size: 15px;
      cursor: pointer;
    }

    .send {
      min-height: 44px;
    }
  }

  .send {
    padding: 11px 18px;
    border: 0;
    background: var(--ink);
    color: var(--on-ink);
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }
</style>
