import { join } from 'node:path';
import { backendJob, backendReply } from '@project-tracker/contract';
import { z } from 'zod';
import type { CallTracker } from './client';
import type { LauncherConfig } from './config';
import { runExecution, type FinishInput } from './execute';
import { heldFiles } from './locks';

export interface LauncherRuntime {
  stop: () => Promise<void>;
}

export interface LauncherDependencies {
  call: CallTracker;
  holdScript: string;
  log: (line: string) => void;
}

const HEARTBEAT_MS = 10_000;
const LONG_POLL_SECONDS = 20;
const taken = z.object({ request: backendJob.nullable() });

interface Running {
  overlapped: boolean;
  done: Promise<void>;
}

/** What the launcher shares between its loop, its executions and its signs of life. */
interface LauncherState {
  config: LauncherConfig;
  deps: LauncherDependencies;
  running: Map<string, Running>;
  abort: AbortController;
  stopped: boolean;
}

/**
 * The launcher (ADR 0010): signs of life, takes the requests, runs at most `maxParallel` agents,
 * hands every result back, and tries again with longer and longer pauses while the tracker is away.
 */
export function startLauncher(config: LauncherConfig, deps: LauncherDependencies): LauncherRuntime {
  const state: LauncherState = {
    config,
    deps,
    running: new Map(),
    abort: new AbortController(),
    stopped: false,
  };
  const timer = setInterval(() => void heartbeat(state), HEARTBEAT_MS);
  const looping = takeRequests(state);
  return {
    stop: async () => {
      state.stopped = true;
      state.abort.abort();
      clearInterval(timer);
      await looping;
      await Promise.all([...state.running.values()].map((running) => running.done));
    },
  };
}

async function takeRequests(state: LauncherState): Promise<void> {
  let pause = 1000;
  await heartbeat(state);
  while (!state.stopped) {
    if (state.running.size >= state.config.maxParallel) {
      await Promise.race([...state.running.values()].map((running) => running.done));
      continue;
    }
    try {
      const input = { launcher: state.config.name, waitSeconds: LONG_POLL_SECONDS };
      const answer = taken.parse(
        await state.deps.call('takeBackendRequest', input, state.abort.signal),
      );
      pause = 1000;
      if (answer.request) execute(state, answer.request);
    } catch (error) {
      if (state.abort.signal.aborted) return;
      state.deps.log(
        `tracker injoignable, nouvel essai dans ${String(pause / 1000)} s : ${String(error)}`,
      );
      await new Promise((resolve) => setTimeout(resolve, pause));
      pause = Math.min(pause * 2, 60_000);
    }
  }
}

function execute(state: LauncherState, job: z.infer<typeof backendJob>): void {
  for (const other of state.running.values()) other.overlapped = true;
  const running: Running = { overlapped: state.running.size > 0, done: Promise.resolve() };
  state.running.set(job.executionId, running);
  state.deps.log(`${job.executionId} : ${job.key}, agent démarré`);
  const { config } = state;
  const settings = {
    mirror: config.mirror,
    locksDir: join(config.workFolder, 'locks'),
    runsDir: join(config.workFolder, 'runs'),
    command: config.command,
    maxSeconds: config.maxSeconds,
    holdScript: state.deps.holdScript,
    // Claude Code reads JSON Schema draft-07 (POC, R3).
    schema: JSON.stringify(z.toJSONSchema(backendReply, { target: 'draft-7' })),
  };
  running.done = runExecution(job, settings, () => running.overlapped)
    .then((result) => handBack(state, result))
    .finally(() => {
      state.running.delete(job.executionId);
      void heartbeat(state);
    });
}

async function heartbeat(state: LauncherState): Promise<void> {
  const holds = heldFiles(join(state.config.workFolder, 'locks')).map((hold) => ({
    path: hold.path,
    key: hold.key,
  }));
  const input = { name: state.config.name, running: [...state.running.keys()], holds };
  await state.deps.call('launcherHeartbeat', input).catch(() => undefined);
}

/** Hands the result back; keeps trying while the tracker is away, since nothing must be lost. */
async function handBack(state: LauncherState, result: FinishInput): Promise<void> {
  let pause = 1000;
  for (;;) {
    try {
      await state.deps.call('finishExecution', result);
      state.deps.log(`${result.executionId} : terminé en ${String(result.seconds)} s`);
      return;
    } catch (error) {
      if (state.stopped && pause > 8000) {
        state.deps.log(`${result.executionId} : résultat non remis (${String(error)})`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, pause));
      pause = Math.min(pause * 2, 60_000);
    }
  }
}
