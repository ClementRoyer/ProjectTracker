<script lang="ts">
  import { recordTestRun } from '@project-tracker/contract';
  import type { Tracker } from '../lib/tracker.svelte';

  let { tracker, ticketKey }: { tracker: Tracker; ticketKey: string } = $props();

  let open = $state(false);
  let kind: 'visual' | 'user' = $state('visual');
  let passed = $state(true);
  let note = $state('');

  async function save(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const trimmed = note.trim();
    const saved = await tracker.act(recordTestRun, {
      key: ticketKey,
      kind,
      passed,
      ...(trimmed === '' ? {} : { note: trimmed }),
    });
    if (saved) {
      open = false;
      note = '';
    }
  }
</script>

{#if open}
  <form class="manual" aria-label="Noter un test manuel" onsubmit={save}>
    <label>
      Test
      <select bind:value={kind}>
        <option value="visual">visuel</option>
        <option value="user">par l’utilisateur</option>
      </select>
    </label>
    <div class="result" role="radiogroup" aria-label="Résultat">
      <label><input type="radio" bind:group={passed} value={true} /> réussi</label>
      <label><input type="radio" bind:group={passed} value={false} /> en échec</label>
    </div>
    <label class="visually-hidden" for="manual-note-{ticketKey}">Retour</label>
    <textarea
      id="manual-note-{ticketKey}"
      rows="2"
      bind:value={note}
      placeholder="Le retour, s’il y en a un"></textarea>
    <div class="buttons">
      <button type="submit" class="save">Noter</button>
      <button type="button" class="quiet" onclick={() => (open = false)}>Annuler</button>
    </div>
  </form>
{:else}
  <button type="button" class="link" onclick={() => (open = true)}>Noter un test manuel</button>
{/if}

<style>
  .manual {
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: 13px;
  }

  .result {
    display: flex;
    gap: 12px;
  }

  select,
  textarea {
    padding: 6px 8px;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
  }

  .buttons {
    display: flex;
    gap: 8px;
  }

  .save {
    padding: 6px 12px;
    border: 0;
    border-radius: 6px;
    background: var(--ink);
    color: var(--on-ink);
    font-weight: 600;
    cursor: pointer;
  }

  .quiet {
    padding: 6px 12px;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
  }

  .link {
    align-self: flex-start;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--blue);
    text-decoration: underline;
    font-size: 13px;
    cursor: pointer;
  }
</style>
