import { z } from 'zod';

/** The scripts of the Claude Code adapter, copied into the project with the tool (ADR 0030). */
const SCRIPTS_DIR = '"$CLAUDE_PROJECT_DIR"/tools/tracker/app/claude';
const MARK = '/tools/tracker/app/claude/';

const HOOKS = [
  { event: 'SessionStart', script: 'session-start.js' },
  { event: 'UserPromptSubmit', script: 'prompt-submit.js' },
  { event: 'Stop', script: 'stop.js' },
] as const;

const hook = z.object({ command: z.string().optional() }).loose();
const group = z.object({ hooks: z.array(hook).default([]) }).loose();
const settingsFile = z
  .object({
    env: z.record(z.string(), z.string()).optional(),
    hooks: z.record(z.string(), z.array(group)).optional(),
  })
  .loose();

type Group = z.infer<typeof group>;
export type ClaudeSettings = z.infer<typeof settingsFile>;

const isTrackerGroup = (candidate: Group): boolean =>
  candidate.hooks.some((h) => h.command?.includes(MARK) === true);

/**
 * The project's settings with the tracker's hooks and address, once; the rest stays as it was.
 * No co-author line from Claude Code: the developer is the author (ADR 0009, 0043).
 */
export function withTrackerHooks(
  raw: unknown,
  trackerUrl: string,
): ClaudeSettings & { hooks: Record<string, Group[]>; env: Record<string, string> } {
  const settings = withoutTracker(raw);
  const hooks: Record<string, Group[]> = { ...settings.hooks };
  for (const { event, script } of HOOKS) {
    const command = `node ${SCRIPTS_DIR}/${script}`;
    hooks[event] = [...(hooks[event] ?? []), { hooks: [{ type: 'command', command }] }];
  }
  return {
    attribution: { commit: '', pr: '' },
    ...settings,
    hooks,
    env: { ...settings.env, TRACKER_URL: trackerUrl },
  };
}

/** The project's settings without anything the tracker added. */
export function withoutTracker(raw: unknown): ClaudeSettings {
  const settings = settingsFile.parse(raw);
  const { hooks, env, ...rest } = settings;
  const kept = Object.entries(hooks ?? {})
    .map(([event, groups]) => [event, groups.filter((g) => !isTrackerGroup(g))] as const)
    .filter(([, groups]) => groups.length > 0);
  const otherEnv = Object.entries(env ?? {}).filter(([name]) => name !== 'TRACKER_URL');
  return {
    ...rest,
    ...(kept.length > 0 ? { hooks: Object.fromEntries(kept) } : {}),
    ...(otherEnv.length > 0 ? { env: Object.fromEntries(otherEnv) } : {}),
  };
}

const mcpFile = z.object({ mcpServers: z.record(z.string(), z.unknown()).default({}) }).loose();

/** `.mcp.json` with the tracker's MCP server in HTTP; push by channel stays off by default (ADR 0020). */
export function withTrackerMcp(raw: unknown, trackerUrl: string): z.infer<typeof mcpFile> {
  const mcp = mcpFile.parse(raw);
  return {
    ...mcp,
    mcpServers: {
      ...mcp.mcpServers,
      tracker: { type: 'http', url: `${trackerUrl}/mcp`, headers: { 'x-tracker-channel': 'off' } },
    },
  };
}
