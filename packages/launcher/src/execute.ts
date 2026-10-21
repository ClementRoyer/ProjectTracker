import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { backendReply, usageLine, type BackendJob } from '@project-tracker/contract';
import { z } from 'zod';
import { heldFiles, lastRefusal, releaseExecution } from './locks';
import { changedSince, snapshot } from './mirror';

export interface ExecutionSettings {
  mirror: string;
  locksDir: string;
  runsDir: string;
  /** The agent command, configured on the back-end server; `@SCHEMA@` becomes the JSON Schema of the reply. */
  command: readonly string[];
  maxSeconds: number;
  /** The script of the `hold` command, run with Node. */
  holdScript: string;
  schema: string;
  env?: Readonly<Record<string, string>>;
}

export type FinishInput = {
  executionId: string;
  reply?: z.infer<typeof backendReply>;
  raw?: string;
  failure?: string;
  changedFiles: string[];
  undeclared: string[];
  uncertainAuthor: boolean;
  blockedOn?: { path: string; heldBy: string };
  seconds: number;
  usage?: z.infer<typeof usageLine>[];
};

/**
 * Runs one fresh agent for a back-end request (ADR 0010): the launch text goes through a file and the
 * standard input, the changes are measured on the mirror, the holds are freed whatever happens.
 */
export async function runExecution(
  job: BackendJob,
  settings: ExecutionSettings,
  overlapped: () => boolean,
): Promise<FinishInput> {
  mkdirSync(settings.runsDir, { recursive: true });
  const promptFile = join(settings.runsDir, `${job.executionId}.prompt.md`);
  const holdCommand = `node ${settings.holdScript}`;
  writeFileSync(promptFile, `${job.prompt}\n\n${rules(holdCommand)}`);
  const before = snapshot(settings.mirror);
  const started = Date.now();
  const run = await spawnAgent(settings, job, promptFile);
  const seconds = Math.round((Date.now() - started) / 1000);
  writeFileSync(join(settings.runsDir, `${job.executionId}.out.txt`), run.output);
  const mine = heldFiles(settings.locksDir)
    .filter((hold) => hold.executionId === job.executionId)
    .map((hold) => hold.path);
  const others = new Set(
    heldFiles(settings.locksDir)
      .filter((hold) => hold.executionId !== job.executionId)
      .map((hold) => hold.path),
  );
  const refusal = lastRefusal(settings.locksDir, job.executionId);
  releaseExecution(settings.locksDir, job.executionId);
  const changed = changedSince(before, snapshot(settings.mirror)).filter(
    (path) => !others.has(path),
  );
  const parsed = parseOutput(run.output);
  return {
    executionId: job.executionId,
    ...parsed,
    ...(run.failure ? { failure: run.failure } : {}),
    changedFiles: changed,
    undeclared: changed.filter((path) => !mine.includes(path)),
    uncertainAuthor: overlapped(),
    ...(refusal && parsed.reply?.status !== 'done' ? { blockedOn: refusal } : {}),
    seconds,
  };
}

function rules(holdCommand: string): string {
  return [
    'Back-end server rules:',
    '- You work in the current folder, a mirror without git.',
    `- BEFORE changing a file, declare it: ${holdCommand} <file path>`,
    '- If the command answers REFUSED, do not change that file and reply with the status blocked.',
  ].join('\n');
}

function spawnAgent(
  settings: ExecutionSettings,
  job: BackendJob,
  promptFile: string,
): Promise<{ output: string; failure?: string }> {
  const [program, ...args] = settings.command.map((part) =>
    part.replace('@SCHEMA@', settings.schema).replace('@PROMPT_FILE@', promptFile),
  );
  if (program === undefined) {
    return Promise.resolve({ output: '', failure: 'empty agent command' });
  }
  return new Promise((resolve) => {
    const child = spawn(program, args, {
      cwd: settings.mirror,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        ...settings.env,
        TRACKER_LOCKS: settings.locksDir,
        TRACKER_MIRROR: settings.mirror,
        TRACKER_TICKET: job.key,
        TRACKER_EXECUTION: job.executionId,
        TRACKER_HOLD_SCRIPT: settings.holdScript,
      },
    });
    let output = '';
    let timedOut = false;
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stdin.end(`${job.prompt}\n\n${rules(`node ${settings.holdScript}`)}`);
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, settings.maxSeconds * 1000);
    child.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        resolve({
          output,
          failure: `agent stopped after ${String(settings.maxSeconds)} s (maximum duration)`,
        });
      } else if (code !== 0) {
        resolve({ output, failure: `agent ended with code ${String(code)}` });
      } else resolve({ output });
    });
  });
}

const claudeUsage = z.record(
  z.string(),
  z
    .object({
      inputTokens: z.number().default(0),
      outputTokens: z.number().default(0),
      cacheReadInputTokens: z.number().default(0),
      cacheCreationInputTokens: z.number().default(0),
    })
    .loose(),
);
const envelope = z
  .object({
    structured_output: z.unknown().optional(),
    result: z.string().optional(),
    modelUsage: claudeUsage.optional(),
  })
  .loose();

/** The reply of any agent: a JSON reply, or the envelope of `claude -p` holding one; otherwise the raw text. */
function parseOutput(output: string): {
  reply?: z.infer<typeof backendReply>;
  raw?: string;
  usage?: z.infer<typeof usageLine>[];
} {
  const json = readJson(output);
  const wrapped = envelope.safeParse(json);
  const candidate =
    wrapped.success && wrapped.data.structured_output !== undefined
      ? wrapped.data.structured_output
      : json;
  const reply = backendReply.safeParse(candidate);
  const usage =
    wrapped.success && wrapped.data.modelUsage ? toUsage(wrapped.data.modelUsage) : undefined;
  const text =
    wrapped.success && wrapped.data.result !== undefined ? wrapped.data.result : output.trim();
  return {
    ...(reply.success ? { reply: reply.data } : { raw: text }),
    ...(usage ? { usage } : {}),
  };
}

function readJson(output: string): unknown {
  const lines = [output.trim(), output.trim().split('\n').at(-1) ?? ''];
  for (const line of lines) {
    try {
      return JSON.parse(line);
    } catch {
      // Not JSON: try the last line, then give up and keep the raw text.
    }
  }
  return undefined;
}

function toUsage(models: z.infer<typeof claudeUsage>): z.infer<typeof usageLine>[] {
  return Object.entries(models).map(([model, used]) => ({
    model,
    inputTokens: used.inputTokens,
    outputTokens: used.outputTokens,
    cacheReadTokens: used.cacheReadInputTokens,
    cacheWriteTokens: used.cacheCreationInputTokens,
  }));
}
