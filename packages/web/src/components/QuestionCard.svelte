<script lang="ts">
  import { answerQuestion, type OpenQuestionView } from '@project-tracker/contract';
  import { ago } from '../lib/format';
  import type { Tracker } from '../lib/tracker.svelte';

  let {
    tracker,
    question,
    now,
    onAnswered,
  }: {
    tracker: Tracker;
    question: OpenQuestionView;
    now: string;
    onAnswered?: () => void;
  } = $props();

  let other = $state('');

  async function answer(text: string): Promise<void> {
    const body = text.trim();
    if (body === '') return;
    const answered = await tracker.act(answerQuestion, {
      questionId: question.questionId,
      answer: body,
    });
    if (answered) {
      other = '';
      onAnswered?.();
    }
  }

  const asker = $derived(
    question.role === 'backend' ? 'du back-end' : `de ${question.author ?? 'l’agent'}`,
  );
</script>

<div role="group" aria-label="Question pour toi" class="card">
  <span class="head"
    >{`Pour toi · question ${asker} · ${ago(question.askedAt, now)}`.toUpperCase()}</span
  >
  <strong class="text">{question.text}</strong>
  {#if question.context}<span class="context">{question.context}</span>{/if}
  {#if question.options.length > 0}
    <div class="options">
      {#each question.options as option (option)}
        {@const recommended = option === question.recommendation}
        <button type="button" class:recommended onclick={() => answer(option)}>
          <b>{option}</b>
          {#if recommended}<span class="detail">Recommandé</span>{/if}
        </button>
      {/each}
    </div>
  {:else if question.recommendation}
    <span class="context">Recommandation : {question.recommendation}</span>
  {/if}
  <form
    class="other"
    onsubmit={(event) => {
      event.preventDefault();
      void answer(other);
    }}
  >
    <label class="visually-hidden" for="answer-{question.questionId}">Ta réponse</label>
    <input
      id="answer-{question.questionId}"
      bind:value={other}
      placeholder={question.options.length > 0 ? 'Ou réponds autrement…' : 'Ta réponse…'}
    />
    <button type="submit">Répondre</button>
  </form>
</div>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 18px;
    background: var(--surface);
    border: 2px solid var(--blue);
    border-radius: 12px;
  }

  .head {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    color: var(--blue);
  }

  .text {
    font-size: 16px;
  }

  .context {
    color: var(--text-2);
    line-height: 1.45;
  }

  .options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 10px;
  }

  .options button {
    display: flex;
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
    padding: 13px 15px;
    border-radius: 10px;
    text-align: left;
    color: var(--text);
    cursor: pointer;
    border: 1px solid var(--line-strong);
    background: var(--surface);
  }

  .options button.recommended {
    border: 2px solid var(--blue);
    background: var(--blue-soft);
  }

  .detail {
    font-size: 13px;
    color: var(--text-2);
  }

  .other {
    display: flex;
    gap: 8px;
  }

  .other input {
    flex: 1;
    min-width: 0;
    padding: 8px 10px;
    border: 1px solid var(--line-strong);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
  }

  .other button {
    padding: 8px 14px;
    border: 0;
    border-radius: 8px;
    background: var(--ink);
    color: var(--on-ink);
    font-weight: 600;
    cursor: pointer;
  }
</style>
