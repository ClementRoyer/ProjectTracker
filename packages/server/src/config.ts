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
      .describe('Motifs des documents de référence, depuis la racine du projet'),
    worktree: z
      .object({
        branch: z.string().min(1).default('ticket/{key}'),
        setup: z.string().min(1).optional(),
      })
      .strict()
      .optional()
      .describe(
        'Dossier de travail par ticket (ADR 0041) : modèle de branche, commande de préparation',
      ),
    preview: z
      .object({ setup: z.string().min(1).optional() })
      .strict()
      .optional()
      .describe('Aperçu par branche d’intégration (ADR 0042) : commande de préparation'),
    commit: z
      .object({ gitmoji: z.boolean().default(true) })
      .strict()
      .optional()
      .describe('Commande de commit (ADR 0043) : message en gitmoji exigé ou non'),
    changelog: z.boolean().default(false),
    changelogFile: z
      .string()
      .default('CHANGELOG.md')
      .describe('Relatif à la racine du projet, deux dossiers au-dessus de la configuration'),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/, 'un code de devise ISO 4217, par exemple USD ou EUR')
      .optional(),
  })
  .strict();

export type Config = z.infer<typeof configSchema>;

export function parseConfig(raw: unknown): Result<Config, string> {
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    return fail(
      parsed.error.issues
        .map((issue) => `${issue.path.join('.') || '(racine)'} : ${issue.message}`)
        .join('\n'),
    );
  }
  const config = parsed.data;
  if (!isAllowedHost(config, config.host)) {
    return fail(
      `host : ${config.host} n'est ni la boucle locale ni une adresse de privateAddresses ; l'outil n'écoute jamais ailleurs.`,
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
