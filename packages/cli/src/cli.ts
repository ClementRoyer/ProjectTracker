import {
  agentOperations,
  backendOperations,
  resourceOperations,
  ticketOperations,
  type Operation,
} from '@project-tracker/contract';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { commandName, fieldsOf, readInput } from './arguments';
import { attachFile, parseAttach } from './attach';
import { commit, parseCommit } from './commit';
import { deliver, parseDeliver } from './deliver';
import { changedFiles } from './git';
import { parseResourceRun, runWithResource } from './resource-run';
import { findTarget, findTrackerFolder, projectRepos, type Target } from './target';
import { mainProject } from './folders';
import { buildPreview } from './preview';
import { addWorktree, parseWorktree, removeWorktree } from './worktree';

export interface CliResult {
  code: number;
  out: string;
  err: string;
}

const CALLER_NAMES: Readonly<Record<string, string>> = {
  developer: 'the developer',
  agent: 'the agents',
  launcher: 'the launcher',
};

const OPERATIONS: readonly Operation<z.ZodType, z.ZodType>[] = [
  ...ticketOperations,
  ...agentOperations,
  ...backendOperations,
  ...resourceOperations,
];

/** The CLI is a thin client of the HTTP API (ADR 0011): one command per operation of the catalogue (ADR 0026). */
export async function runCli(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
): Promise<CliResult> {
  const [command, ...rest] = args;
  if (command === undefined || command === 'help' || command === '--help') return done(help());
  const special = specialCommand(command, rest);
  if (special) return special.run(special.args, env, cwd);
  const operation = OPERATIONS.find((candidate) => commandName(candidate.name) === command);
  if (!operation) return failed(`Unknown command: ${command}. See "tracker help".`);
  if (rest.includes('--help')) return done(usage(operation));
  const input = buildInput(operation, rest, cwd, env);
  if (typeof input === 'string') return failed(input);
  const target = findTarget(env, cwd);
  if (typeof target === 'string') return failed(target);
  return send(target, operation, input);
}

type Run = (
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
) => Promise<CliResult>;

/** The commands that are more than one operation of the catalogue. */
function specialCommand(command: string, rest: string[]): { run: Run; args: string[] } | null {
  if (command === 'resource' && rest[0] === 'run') return { run: resourceRun, args: rest.slice(1) };
  if (command === 'attach') return { run: attach, args: rest };
  if (command === 'worktree') return { run: worktree, args: rest };
  if (command === 'commit') return { run: commitCommand, args: rest };
  if (command === 'deliver') return { run: deliverCommand, args: rest };
  if (command === 'preview' && rest[0] === 'build') return { run: preview, args: rest.slice(1) };
  return null;
}

async function attach(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
): Promise<CliResult> {
  const request = parseAttach(args);
  if (typeof request === 'string') return failed(request);
  const target = findTarget(env, cwd);
  if (typeof target === 'string') return failed(target);
  try {
    return done(await attachFile(target, { ...request, file: resolve(cwd, request.file) }));
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  }
}

async function worktree(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
): Promise<CliResult> {
  const command = parseWorktree(args);
  if (typeof command === 'string') return failed(command);
  const trackerDir = findTrackerFolder(cwd);
  const target = findTarget(env, cwd);
  if (typeof target === 'string' || trackerDir === undefined) {
    return failed(typeof target === 'string' ? target : 'Run the command inside the project.');
  }
  const project = mainProject(trackerDir);
  try {
    const base = { ...command, base: command.base ?? env.TRACKER_BASE };
    return done(
      command.action === 'add'
        ? await addWorktree(target, project, base)
        : await removeWorktree(target, project, base),
    );
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  }
}

async function commitCommand(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
): Promise<CliResult> {
  const command = parseCommit(args);
  if (typeof command === 'string') return failed(command);
  const trackerDir = findTrackerFolder(cwd);
  const target = findTarget(env, cwd);
  if (typeof target === 'string' || trackerDir === undefined) {
    return failed(typeof target === 'string' ? target : 'Run the command inside the project.');
  }
  try {
    return done(await commit(target, mainProject(trackerDir), trackerDir, command));
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  }
}

async function deliverCommand(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
): Promise<CliResult> {
  const command = parseDeliver(args);
  if (typeof command === 'string') return failed(command);
  const trackerDir = findTrackerFolder(cwd);
  const target = findTarget(env, cwd);
  if (typeof target === 'string' || trackerDir === undefined) {
    return failed(typeof target === 'string' ? target : 'Run the command inside the project.');
  }
  const base = command.base ?? env.TRACKER_BASE ?? 'main';
  try {
    return done(await deliver(target, mainProject(trackerDir), command, base));
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  }
}

async function preview(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
): Promise<CliResult> {
  const trackerDir = findTrackerFolder(cwd);
  const target = findTarget(env, cwd);
  if (typeof target === 'string' || trackerDir === undefined) {
    return failed(typeof target === 'string' ? target : 'Run the command inside the project.');
  }
  const base = takeOption(args, '--base').value ?? env.TRACKER_BASE ?? 'main';
  try {
    return done(await buildPreview(target, mainProject(trackerDir), base));
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  }
}

async function resourceRun(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
): Promise<CliResult> {
  const run = parseResourceRun(args);
  if (typeof run === 'string') return failed(run);
  const target = findTarget(env, cwd);
  if (typeof target === 'string') return failed(target);
  try {
    const code = await runWithResource(target, run, (line) => process.stderr.write(`${line}\n`));
    return { code, out: '', err: '' };
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  }
}

/** One git folder, or each repository the project names, paths from the project root (ADR 0040). */
function projectChangedFiles(cwd: string, base: string): string[] {
  const project = projectRepos(cwd);
  if (project === null) return changedFiles(cwd, base);
  return project.repos.flatMap((repo) =>
    changedFiles(join(project.root, repo.path), base).map((file) => `${repo.path}/${file}`),
  );
}

function buildInput(
  operation: Operation<z.ZodType, z.ZodType>,
  args: readonly string[],
  cwd: string,
  env: Readonly<Record<string, string | undefined>>,
): unknown {
  const base = takeOption(args, '--base');
  try {
    const raw = readInput(operation.input, base.rest);
    if (operation.name === 'reportChangedFiles' && raw.files === undefined) {
      raw.files = projectChangedFiles(cwd, base.value ?? env.TRACKER_BASE ?? 'main');
    }
    const parsed = operation.input.safeParse(raw);
    if (parsed.success) return parsed.data;
    return parsed.error.issues
      .map((issue) => `--${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

async function send(
  target: Target,
  operation: Operation<z.ZodType, z.ZodType>,
  input: unknown,
): Promise<CliResult> {
  let response: Response;
  try {
    response = await fetch(`${target.url}/api/${operation.name}`, {
      method: 'POST',
      headers: { authorization: `Bearer ${target.token}`, 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
  } catch {
    return failed(
      `The project-tracker server does not answer on ${target.url}. Start it in the project: npm start (or node dist/server.js tools/tracker/tracker.config.json).`,
    );
  }
  const body: unknown = await response.json().catch(() => null);
  if (response.ok) return done(JSON.stringify(body, null, 2));
  return failed(explain(response.status, operation, body));
}

function explain(
  status: number,
  operation: Operation<z.ZodType, z.ZodType>,
  body: unknown,
): string {
  const error = z.object({ error: z.string() }).safeParse(body);
  if (status === 401) {
    return 'Token refused: run "introduce" again, or restart the server to get a new developer token.';
  }
  if (status === 403) {
    return `Command reserved for: ${operation.callers.map((caller) => CALLER_NAMES[caller]).join(', ')}.`;
  }
  return `Refused: ${error.success ? error.data.error : `error ${String(status)}`}`;
}

function help(): string {
  const lines = OPERATIONS.map(
    (operation) => `  ${commandName(operation.name).padEnd(22)} ${operation.description}`,
  );
  const resourceRun =
    '  resource run           Runs a command while holding a shared resource: tracker resource run e2e --key LOC-1 -- npm run e2e\n  attach                 Attaches a file to the ticket: tracker attach LOC-1 capture.png [--message "..."]\n  worktree add           Creates the working folder of the ticket: tracker worktree add LOC-1 [--branch b] [--base main]\n  worktree remove        Removes the working folder of the ticket (the branch stays): tracker worktree remove LOC-1\n  preview build          Rebuilds the preview: the base plus the branches of the open tickets, in .worktrees/preview [--base main]\n  commit                 Commits following the convention, without co-author, and notes it on the ticket: tracker commit "✨ Add search" [--ticket LOC-1]\n  deliver                Merges the branches of the batch into the base, one commit per ticket, and notes the delivery: tracker deliver "Batch 12" LOC-1 LOC-2 [--base main] [--keep LOC-2]';
  return `Usage: tracker <command> [KEY] [--field value ...]\n\n${lines.join('\n')}\n${resourceRun}\n\nDetails of a command: tracker <command> --help`;
}

function usage(operation: Operation<z.ZodType, z.ZodType>): string {
  const fields = fieldsOf(operation.input).map(
    (field) => `  --${field.path.join('.')}${field.kind === 'list' ? ' (repeatable)' : ''}`,
  );
  return `${commandName(operation.name)}: ${operation.description}\n\n${fields.join('\n')}`;
}

function takeOption(
  args: readonly string[],
  name: string,
): { value: string | undefined; rest: string[] } {
  const index = args.indexOf(name);
  if (index === -1) return { value: undefined, rest: [...args] };
  return { value: args[index + 1], rest: [...args.slice(0, index), ...args.slice(index + 2)] };
}

function done(out: string): CliResult {
  return { code: 0, out, err: '' };
}

function failed(err: string): CliResult {
  return { code: 1, out: '', err };
}
