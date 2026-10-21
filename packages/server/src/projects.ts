import { existsSync, readFileSync } from 'node:fs';
import { registryEntry } from '@project-tracker/contract';
import type { Hono } from 'hono';
import { z } from 'zod';
import { bearerToken, resolveCaller, type AppOptions } from './auth';

const PING_MS = 500;

/** GET /api/projects: the projects of the machine whose tracker answers, for the menu (ADR 0039). */
export function mountProjects(app: Hono, options: AppOptions, ownUrl: string): void {
  app.get('/api/projects', async (c) => {
    if (resolveCaller(options, bearerToken(c.req.header('authorization')))?.kind !== 'developer') {
      return c.json({ error: 'unauthorized' }, 401);
    }
    const entries = readEntries(options.registryFile);
    const answering = await Promise.all(
      entries.map(async (entry) => entry.url === ownUrl || (await answers(entry.url))),
    );
    const projects = entries
      .filter((_, index) => answering[index] === true)
      .map(({ name, url }) => ({ name, url, current: url === ownUrl }));
    return c.json({ projects });
  });
}

function readEntries(file: string | undefined): z.infer<typeof registryEntry>[] {
  if (file === undefined || !existsSync(file)) return [];
  const parsed = z.array(registryEntry).safeParse(JSON.parse(readFileSync(file, 'utf8')));
  return parsed.success ? parsed.data : [];
}

async function answers(url: string): Promise<boolean> {
  try {
    await fetch(`${url}/`, { signal: AbortSignal.timeout(PING_MS) });
    return true;
  } catch {
    return false;
  }
}
