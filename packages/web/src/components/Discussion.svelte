<script lang="ts">
  import type { AttachmentView, EntryView } from '@project-tracker/contract';
  import { shortDate } from '../lib/format';
  import { threadOf } from '../lib/thread';

  let {
    entries,
    openQuestionIds,
    attachments,
    fileUrl,
  }: {
    entries: EntryView[];
    openQuestionIds: string[];
    attachments: AttachmentView[];
    fileUrl: (url: string) => string;
  } = $props();

  const IMAGES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
  const byId = $derived(new Map(attachments.map((attachment) => [attachment.id, attachment])));

  /** The attachments a journal entry carries (ADR 0035). */
  function carried(item: { id: string }): AttachmentView[] {
    const entry = entries.find((candidate) => candidate.id === item.id);
    const data = entry?.data;
    if (typeof data !== 'object' || data === null || !('attachments' in data)) return [];
    const ids = Array.isArray(data.attachments) ? data.attachments : [];
    return ids.flatMap((id) => {
      const found = typeof id === 'string' ? byId.get(id) : undefined;
      return found ? [found] : [];
    });
  }

  // An open question is shown once, in its card under the discussion.
  const thread = $derived(threadOf(entries.filter((entry) => !openQuestionIds.includes(entry.id))));
</script>

{#each thread as item (item.id)}
  {#if item.kind === 'mark'}
    <div class="mark-row">
      <span class="mark" class:strong={item.strong}>{shortDate(item.at, true)} · {item.body}</span>
    </div>
  {:else}
    <div class="message" class:mine={item.side === 'mine'}>
      <span class="avatar tone-{item.tone}" aria-hidden="true">{item.initials}</span>
      <div class="bubble">
        <span class="meta"><b>{item.author}</b> {item.to} · {shortDate(item.at, true)}</span>
        <span class="body">{item.body}</span>
        {#each carried(item) as file (file.id)}
          {#if file.mime !== null && IMAGES.includes(file.mime)}
            <a href={fileUrl(file.url)} target="_blank" rel="noreferrer">
              <img class="shot" src={fileUrl(file.url)} alt={file.name} />
            </a>
          {:else}
            <a class="file" href={fileUrl(file.url)} download={file.name}>{file.name}</a>
          {/if}
        {/each}
        {#if item.receipt !== null}<span class="meta">{item.receipt}</span>{/if}
      </div>
    </div>
  {/if}
{/each}

<style>
  .mark-row {
    display: flex;
    justify-content: center;
  }

  .mark {
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 999px;
    text-align: center;
    background: var(--sunken);
    color: var(--text-2);
  }

  .mark.strong {
    background: var(--ink);
    color: var(--on-ink);
  }

  .message {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }

  .message.mine {
    flex-direction: row-reverse;
  }

  .avatar {
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    background: var(--sunken);
    color: var(--text);
  }

  .avatar.tone-developer {
    background: var(--ink);
    color: var(--on-ink);
  }

  .avatar.tone-backend {
    background: var(--amber-soft);
    color: var(--amber);
    border: 1.5px solid var(--amber);
  }

  .bubble {
    max-width: 560px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 14px;
    border-radius: 12px;
    border-top-left-radius: 4px;
    background: var(--surface);
    border: 1px solid var(--line);
  }

  .mine .bubble {
    border: 0;
    border-radius: 12px;
    border-top-right-radius: 4px;
    background: var(--ink);
    color: var(--on-ink);
  }

  .meta {
    font-size: 12px;
    color: var(--muted);
  }

  .mine .meta {
    color: var(--on-ink-muted);
  }

  .shot {
    display: block;
    max-width: min(320px, 100%);
    max-height: 240px;
    border-radius: 8px;
    border: 1px solid var(--line);
  }

  .file {
    font-size: 13px;
  }

  .mine .file {
    color: var(--on-ink);
  }

  .body {
    white-space: pre-line;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
</style>
