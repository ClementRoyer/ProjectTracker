import { spawn } from 'node:child_process';
import { z } from 'zod';
import type { Target } from './target';

const POLL_MS = 1000;
const RENEW_MS = 20_000;

export interface ResourceRun {
  resource: string;
  key: string;
  command: string[];
}

const granted = z.object({
  granted: z.boolean(),
  heldBy: z.string().nullable(),
  position: z.number(),
});

/**
 * `tracker resource run <resource> --key <ticket> -- <command>` (ADR 0034): waits for the resource, runs the command
 * here, never on the server, keeps the lock alive while it runs, then gives it back. Exits with the command's code.
 */
export async function runWithResource(
  target: Target,
  run: ResourceRun,
  log: (line: string) => void,
): Promise<number> {
  const input = { key: run.key, resource: run.resource };
  let announced = false;
  for (;;) {
    const answer = granted.parse(await call(target, 'acquireResource', input));
    if (answer.granted) break;
    if (!announced) {
      log(
        `En attente de « ${run.resource} », tenue par ${answer.heldBy ?? '?'} (place ${String(answer.position)})…`,
      );
      announced = true;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  const renewal = setInterval(
    () => void call(target, 'renewResource', input).catch(() => undefined),
    RENEW_MS,
  );
  try {
    return await execute(run.command);
  } finally {
    clearInterval(renewal);
    await call(target, 'releaseResource', input).catch(() => undefined);
  }
}

function execute(command: string[]): Promise<number> {
  const [program, ...args] = command;
  if (program === undefined) return Promise.resolve(2);
  return new Promise((done) => {
    const child = spawn(program, args, { stdio: 'inherit' });
    child.on('error', () => {
      done(127);
    });
    child.on('exit', (code) => {
      done(code ?? 1);
    });
  });
}

async function call(target: Target, operation: string, input: object): Promise<unknown> {
  const response = await fetch(`${target.url}/api/${operation}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${target.token}`, 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.string() }).safeParse(body);
    throw new Error(
      `${operation} refusé : ${error.success ? error.data.error : String(response.status)}`,
    );
  }
  return body;
}

/** Reads `<resource> --key <ticket> -- <command…>`; a message when it does not fit. */
export function parseResourceRun(args: readonly string[]): ResourceRun | string {
  const separator = args.indexOf('--');
  const before = separator === -1 ? args : args.slice(0, separator);
  const command = separator === -1 ? [] : args.slice(separator + 1);
  const keyIndex = before.indexOf('--key');
  const key = keyIndex === -1 ? undefined : before[keyIndex + 1];
  const resource = before.find((arg, index) => !arg.startsWith('--') && index !== keyIndex + 1);
  if (resource === undefined || key === undefined || command.length === 0) {
    return 'Usage : tracker resource run <ressource> --key <ticket> -- <commande …>';
  }
  return { resource, key, command };
}
