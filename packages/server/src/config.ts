import { fail, ok, type Result } from '@project-tracker/core/domain';
import { z } from 'zod';

const LOOPBACK = ['127.0.0.1', 'localhost', '::1'];

const price = z.object({
  input: z.number().nonnegative(),
  output: z.number().nonnegative(),
  cacheRead: z.number().nonnegative(),
  cacheWrite: z.number().nonnegative(),
});

/** The configuration file (ADR 0026). Secrets never appear in it: only the names of their variables. */
const configSchema = z
  .object({
    port: z.number().int().min(1024).max(65535).default(9620),
    host: z.string().default('127.0.0.1'),
    privateAddresses: z.array(z.string()).default([]),
    database: z.string().default('tracker.db'),
    timeZone: z.string().optional(),
    staleAfterHours: z.number().positive().default(24),
    workingTimeoutMinutes: z.number().positive().default(15),
    jira: z
      .object({
        baseUrl: z.url(),
        project: z.string().min(1),
        parents: z
          .preprocess(
            // A list, or one text as people write it by hand: "PROJ-1, PROJ-2".
            (value) =>
              typeof value === 'string'
                ? value
                    .split(',')
                    .map((key) => key.trim().toUpperCase())
                    .filter((key) => key !== '')
                : value,
            z.array(z.string().regex(/^[A-Z][A-Z0-9_]*-\d+$/, 'a ticket key, for example PROJ-12')),
          )
          .optional()
          .describe('Only the children of these tickets (ADR 0052)'),
        emailEnv: z.string().min(1),
        tokenEnv: z.string().min(1),
      })
      .strict()
      .optional(),
    launcherTokenEnv: z.string().optional(),
    prices: z.record(z.string(), price).default({}),
    resources: z.array(z.string().min(1)).default([]),
    repos: z.array(z.object({ name: z.string().min(1), path: z.string().min(1) })).default([]),
    documents: z
      .array(z.string().min(1))
      .default([])
      .describe('Patterns of the reference documents, from the project root'),
    worktree: z
      .object({
        branch: z.string().min(1).default('ticket/{key}'),
        setup: z.string().min(1).optional(),
      })
      .strict()
      .optional()
      .describe('Working folder per ticket (ADR 0041): branch template, setup command'),
    preview: z
      .object({ setup: z.string().min(1).optional() })
      .strict()
      .optional()
      .describe('Preview per integration branch (ADR 0042): setup command'),
    commit: z
      .object({ gitmoji: z.boolean().default(true) })
      .strict()
      .optional()
      .describe('Commit command (ADR 0043): gitmoji message required or not'),
    changelog: z.boolean().default(false),
    changelogFile: z
      .string()
      .default('CHANGELOG.md')
      .describe('Relative to the project root, two folders above the configuration'),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/, 'an ISO 4217 currency code, for example USD or EUR')
      .optional(),
  })
  .strict();

export type Config = z.infer<typeof configSchema>;

export function parseConfig(raw: unknown): Result<Config, string> {
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
        .join('\n'),
    );
  }
  const config = parsed.data;
  if (!isAllowedHost(config, config.host)) {
    return fail(
      `host: ${config.host} is neither loopback nor an address of privateAddresses; the tool never listens anywhere else.`,
    );
  }
  return ok(config);
}

/** The `Host` values the server answers to: anything else is refused (ADR 0027). */
export function listenAddresses(config: Config): string[] {
  const port = String(config.port);
  return [
    `127.0.0.1:${port}`,
    `localhost:${port}`,
    `[::1]:${port}`,
    ...config.privateAddresses.map((address) => `${address}:${port}`),
  ];
}

function isAllowedHost(config: Config, host: string): boolean {
  return LOOPBACK.includes(host) || config.privateAddresses.includes(host);
}
