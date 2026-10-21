import { posix } from 'node:path';
import type { AttachmentView } from '@project-tracker/contract';
import { z } from 'zod';
import { fail, ok, type Result } from '../domain';
import { findAttachment, insertAttachment, listAttachments, type AttachmentRecord } from '../store';
import { loadTicket, type UsecaseContext, type UsecaseError } from './context';

/** Records a file the server has written next to the database (ADR 0035); `path` is relative to it. */
export function addAttachment(
  ctx: UsecaseContext,
  input: { key: string; id: string; path: string; mime: string | null },
): Result<AttachmentView, UsecaseError> {
  const loaded = loadTicket(ctx, input.key);
  if (!loaded.ok) return loaded;
  const record: AttachmentRecord = {
    id: input.id,
    ticketId: loaded.value.ticket.id,
    path: input.path,
    ...(input.mime === null ? {} : { mime: input.mime }),
    createdAt: ctx.now(),
  };
  insertAttachment(ctx.db, record);
  return ok(toAttachmentView(ctx, record));
}

export function ticketAttachments(ctx: UsecaseContext, ticketId: string): AttachmentView[] {
  return listAttachments(ctx.db, ticketId).map((record) => toAttachmentView(ctx, record));
}

/** The attachment to send back for GET /api/attachments/<id>, with its path relative to the database. */
export function attachmentFile(ctx: UsecaseContext, id: string): AttachmentRecord | null {
  return findAttachment(ctx.db, id);
}

/** The ids, if each is an attachment of this ticket. */
export function checkAttachments(
  ctx: UsecaseContext,
  ticketId: string,
  ids: readonly string[] | undefined,
): Result<string[], UsecaseError> {
  const list = ids ?? [];
  const known = new Set(listAttachments(ctx.db, ticketId).map((record) => record.id));
  return list.every((id) => known.has(id)) ? ok([...list]) : fail('attachmentNotFound');
}

/** What an agent needs to open the attachments a journal entry carries. */
export function attachmentRefs(
  ctx: UsecaseContext,
  data: unknown,
): { name: string; path: string; url: string }[] {
  const carried = z.object({ attachments: z.array(z.string()) }).safeParse(data);
  if (!carried.success) return [];
  return carried.data.attachments.flatMap((id) => {
    const record = findAttachment(ctx.db, id);
    if (!record) return [];
    const { name, path, url } = toAttachmentView(ctx, record);
    return [{ name, path, url }];
  });
}

function toAttachmentView(ctx: UsecaseContext, record: AttachmentRecord): AttachmentView {
  const file = posix.basename(record.path);
  return {
    id: record.id,
    // Files are named <id>-<name>; files migrated from V1 keep their own name.
    name: file.startsWith(`${record.id}-`) ? file.slice(record.id.length + 1) : file,
    mime: record.mime ?? null,
    path: ctx.dataDir === undefined ? record.path : posix.join(ctx.dataDir, record.path),
    url: `/api/attachments/${encodeURIComponent(record.id)}`,
    createdAt: record.createdAt,
  };
}
