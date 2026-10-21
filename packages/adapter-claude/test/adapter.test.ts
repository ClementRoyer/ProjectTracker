import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { onPromptSubmit, onSessionStart, onStop, readReply, usageSince, type Call } from '../src';

const folders: string[] = [];
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true });
});
const folder = (): string => {
  const path = mkdtempSync(join(tmpdir(), 'tracker-adapter-'));
  folders.push(path);
  return path;
};

/** A fake tracker that records the operations it receives. */
const recorder = (
  answers: Record<string, unknown> = {},
): { call: Call; calls: { operation: string; input: unknown; token: string | null }[] } => {
  const calls: { operation: string; input: unknown; token: string | null }[] = [];
  const call: Call = (operation, input, token) => {
    calls.push({ operation, input, token });
    return Promise.resolve(answers[operation] ?? {});
  };
  return { call, calls };
};

describe('end-of-turn reply of a front agent (ADR 0017, 0020)', () => {
  it('reads the last JSON block of the message', () => {
    const message =
      'Work done.\n\n```json\n{"message": "Form done, sorting next.", "question": null}\n```';
    expect(readReply(message)).toEqual({
      reply: { message: 'Form done, sorting next.', question: null },
    });
  });

  it('keeps the whole message when it holds no valid JSON reply', () => {
    expect(readReply('Plain prose, no JSON.')).toEqual({ raw: 'Plain prose, no JSON.' });
  });
});

describe('usage read from the transcript (ADR 0012)', () => {
  it('sums the tokens of each new assistant message once, by model', () => {
    const transcript = join(folder(), 'transcript.jsonl');
    const message = (id: string, output: number): string =>
      JSON.stringify({
        type: 'assistant',
        message: {
          id,
          model: 'model-a',
          usage: {
            input_tokens: 10,
            output_tokens: output,
            cache_read_input_tokens: 100,
            cache_creation_input_tokens: 5,
          },
        },
      });
    writeFileSync(
      transcript,
      [
        message('m1', 50),
        message('m1', 50),
        message('m2', 70),
        JSON.stringify({ type: 'user' }),
      ].join('\n'),
    );
    expect(usageSince(transcript, new Set(['m0']))).toEqual({
      usage: [
        {
          model: 'model-a',
          inputTokens: 20,
          outputTokens: 120,
          cacheReadTokens: 200,
          cacheWriteTokens: 10,
        },
      ],
      messageIds: ['m1', 'm2'],
    });
    expect(usageSince(transcript, new Set(['m1', 'm2'])).usage).toEqual([]);
  });
});

describe('hooks', () => {
  it('introduces a new conversation and tells the agent its token and the reply format', async () => {
    const state = folder();
    const { call, calls } = recorder({ introduce: { token: 'tok-1', agentName: 'front-shop' } });
    const output = await onSessionStart(
      { session_id: 's1', cwd: '/work/shop', source: 'startup' },
      { call, stateDir: state, env: {} },
    );
    expect(calls[0]).toMatchObject({
      operation: 'introduce',
      input: { name: 'front-shop', tool: 'claude-code' },
    });
    expect(output.hookSpecificOutput.additionalContext).toMatch(/tok-1/);
    expect(output.hookSpecificOutput.additionalContext).toMatch(/```json/);
  });

  it('tells the agent to commit with the tool’s command (ADR 0043)', async () => {
    const { call } = recorder({ introduce: { token: 'tok-1', agentName: 'front-shop' } });
    const output = await onSessionStart(
      { session_id: 's1', cwd: '/work/shop', source: 'startup' },
      { call, stateDir: folder(), env: {} },
    );
    expect(output.hookSpecificOutput.additionalContext).toMatch(/tracker\.js commit "/);
  });

  it('tells the agent the reference documents of the project (ADR 0040)', async () => {
    const { call } = recorder({
      introduce: { token: 'tok-1', agentName: 'front-shop' },
      listDocuments: { documents: [{ path: 'README.md' }, { path: 'docs/api.md' }] },
    });
    const output = await onSessionStart(
      { session_id: 's1', cwd: '/work/shop', source: 'startup' },
      { call, stateDir: folder(), env: {} },
    );
    expect(output.hookSpecificOutput.additionalContext).toMatch(/README\.md, docs\/api\.md/);
  });

  it('keeps the same conversation when Claude Code resumes it', async () => {
    const state = folder();
    const first = recorder({ introduce: { token: 'tok-1', agentName: 'front-shop' } });
    await onSessionStart(
      { session_id: 's1', cwd: '/work/shop', source: 'startup' },
      { call: first.call, stateDir: state, env: {} },
    );
    const resumed = recorder({ introduce: { token: 'tok-2', agentName: 'front-shop' } });
    const output = await onSessionStart(
      { session_id: 's1', cwd: '/work/shop', source: 'resume' },
      { call: resumed.call, stateDir: state, env: {} },
    );
    expect(resumed.calls.map((c) => c.operation)).toEqual(['listDocuments']);
    expect(output.hookSpecificOutput.additionalContext).toMatch(/tok-1/);
  });

  it('hands the reply and the new usage to the tracker at the end of a turn, with the conversation token', async () => {
    const state = folder();
    const start = recorder({ introduce: { token: 'tok-1', agentName: 'front-shop' } });
    await onSessionStart(
      { session_id: 's1', cwd: '/work/shop', source: 'startup' },
      { call: start.call, stateDir: state, env: {} },
    );
    const transcript = join(folder(), 't.jsonl');
    writeFileSync(
      transcript,
      JSON.stringify({
        type: 'assistant',
        message: { id: 'm1', model: 'model-a', usage: { input_tokens: 1, output_tokens: 2 } },
      }),
    );
    const stop = recorder();
    await onStop(
      {
        session_id: 's1',
        transcript_path: transcript,
        last_assistant_message: '```json\n{"message": "Done.", "question": null}\n```',
        stop_hook_active: false,
      },
      { call: stop.call, stateDir: state, env: {} },
    );
    expect(stop.calls.map((c) => [c.operation, c.token])).toEqual([
      ['submitReply', 'tok-1'],
      ['reportWorking', 'tok-1'],
      ['recordUsage', 'tok-1'],
    ]);
    expect(stop.calls[1]?.input).toEqual({ working: false });
  });

  it('signals that the agent starts working when a turn begins (ADR 0028)', async () => {
    const state = folder();
    const start = recorder({ introduce: { token: 'tok-1', agentName: 'front-shop' } });
    await onSessionStart(
      { session_id: 's1', cwd: '/work/shop', source: 'startup' },
      { call: start.call, stateDir: state, env: {} },
    );
    const prompt = recorder();
    await onPromptSubmit({ session_id: 's1' }, { call: prompt.call, stateDir: state, env: {} });
    expect(prompt.calls).toEqual([
      { operation: 'reportWorking', input: { working: true }, token: 'tok-1' },
    ]);
  });

  it('does nothing for a conversation the tracker never saw', async () => {
    const stop = recorder();
    await onStop(
      {
        session_id: 'unknown',
        transcript_path: '/nowhere',
        last_assistant_message: 'x',
        stop_hook_active: false,
      },
      { call: stop.call, stateDir: folder(), env: {} },
    );
    expect(stop.calls).toEqual([]);
  });

  it('never fails the turn when the tracker is away', async () => {
    const call: Call = () => Promise.reject(new Error('connection refused'));
    const output = await onSessionStart(
      { session_id: 's1', cwd: '/work/shop', source: 'startup' },
      { call, stateDir: folder(), env: {} },
    );
    expect(output.hookSpecificOutput.additionalContext).toMatch(/injoignable/);
  });
});
