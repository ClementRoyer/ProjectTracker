import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { addAttachment, attachmentFile } from '@project-tracker/core/usecases';
import type { Context, Hono } from 'hono';
import { bearerToken, resolveCaller, usecaseContext, type AppOptions, type Caller } from './auth';

/** Up to 20 MB per file (ADR 0035). */
const MAX_BYTES = 20 * 1024 * 1024;
/** Only these are shown in the page; anything else, SVG included, is a download. */
const INLINE = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

/** POST /api/attachments?key=&name= (raw content) and GET /api/attachments/<id>. */
export function mountAttachments(app: Hono, options: AppOptions, notify: () => void): void {
  app.post('/api/attachments', async (c) => {
    const caller = resolveCaller(options, bearerToken(c.req.header('authorization')));
    if (!caller) return c.json({ error: 'unauthorized' }, 401);
    const content = await readContent(c);
    if (content === null) return c.json({ error: 'tooLarge' }, 413);
    const response = store(c, options, caller, content);
    notify();
    return response;
  });

  app.get('/api/attachments/:id', (c) => {
    const token = bearerToken(c.req.header('authorization')) ?? c.req.query('token') ?? null;
    const caller = resolveCaller(options, token);
    if (!caller) return c.json({ error: 'unauthorized' }, 401);
    const record = attachmentFile(usecaseContext(options, caller.actor), c.req.param('id'));
    const file = record ? join(options.dataDir ?? '', record.path) : null;
    if (!record || file === null || !existsSync(file)) {
      return c.json({ error: 'attachmentNotFound' }, 404);
    }
    return sendFile(c, file, record.mime ?? 'application/octet-stream');
  });
}

/** A common image is shown; anything else is a download, never read as a page. */
function sendFile(c: Context, file: string, mime: string): Response {
  const shown = INLINE.has(mime);
  c.header('x-content-type-options', 'nosniff');
  c.header('content-type', shown ? mime : 'application/octet-stream');
  const disposition = shown ? 'inline' : 'attachment';
  c.header('content-disposition', `${disposition}; filename="${safeName(posix.basename(file))}"`);
  return c.body(readFileSync(file));
}

/** The content, or null when it is over the limit. */
async function readContent(c: Context): Promise<Uint8Array | null> {
  if (Number(c.req.header('content-length') ?? 0) > MAX_BYTES) return null;
  const content = new Uint8Array(await c.req.arrayBuffer());
  return content.byteLength > MAX_BYTES ? null : content;
}

/** Writes the file under attachments/<ticket>/ and records it. */
function store(c: Context, options: AppOptions, caller: Caller, content: Uint8Array): Response {
  const key = c.req.query('key') ?? '';
  const id = randomUUID();
  const name = safeName(c.req.query('name') ?? 'fichier');
  const path = posix.join('attachments', safeName(key), `${id}-${name}`);
  const mime = c.req.header('content-type')?.split(';')[0]?.trim() || null;
  const added = addAttachment(usecaseContext(options, caller.actor), { key, id, path, mime });
  if (!added.ok) return c.json({ error: added.error }, 409);
  const dataDir = options.dataDir ?? '.';
  mkdirSync(join(dataDir, posix.dirname(path)), { recursive: true });
  writeFileSync(join(dataDir, path), content);
  return c.json(added.value);
}

/** A file or folder name that cannot leave its folder: no separators, no dots in front. */
function safeName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? '';
  const cleaned = base
    .replace(/[^\w.-]/g, '_')
    .replace(/^\.+/, '')
    .slice(0, 100);
  return cleaned === '' ? 'fichier' : cleaned;
}
