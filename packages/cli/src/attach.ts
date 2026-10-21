import { readFileSync } from 'node:fs';
import { basename, extname } from 'node:path';
import { z } from 'zod';
import type { Target } from './target';

const TYPES: Readonly<Record<string, string>> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.log': 'text/plain',
  '.json': 'application/json',
};

export interface Attach {
  key: string;
  file: string;
  message: string | undefined;
}

/** `tracker attach <ticket> <file> [--message …]`: sends the file, then notes it in the journal (ADR 0035). */
export async function attachFile(target: Target, attach: Attach): Promise<string> {
  const name = basename(attach.file);
  const upload = await fetch(
    `${target.url}/api/attachments?key=${encodeURIComponent(attach.key)}&name=${encodeURIComponent(name)}`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${target.token}`,
        'content-type': TYPES[extname(name).toLowerCase()] ?? 'application/octet-stream',
      },
      body: readFileSync(attach.file),
    },
  );
  const added = z.object({ id: z.string(), path: z.string() }).safeParse(await upload.json());
  if (!upload.ok || !added.success) {
    throw new Error(`Attachment refused (${String(upload.status)}).`);
  }
  const entry = await fetch(`${target.url}/api/recordEntry`, {
    method: 'POST',
    headers: { authorization: `Bearer ${target.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      key: attach.key,
      entryType: 'exchange',
      body: attach.message ?? `Attachment: ${name}`,
      attachments: [added.data.id],
    }),
  });
  if (!entry.ok) {
    throw new Error(`Attachment kept, but not noted in the journal (${String(entry.status)}).`);
  }
  return `${name} attached to ${attach.key}: ${added.data.path}`;
}

export function parseAttach(args: readonly string[]): Attach | string {
  const index = args.indexOf('--message');
  const message = index === -1 ? undefined : args[index + 1];
  const rest = index === -1 ? args : [...args.slice(0, index), ...args.slice(index + 2)];
  const [key, file] = rest;
  if (key === undefined || file === undefined) {
    return 'Usage: tracker attach <ticket> <file> [--message "..."]';
  }
  return { key, file, message };
}
