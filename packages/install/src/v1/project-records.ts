import type {
  AttachmentRecord,
  DeliveryBatchRecord,
  StoredUsage,
} from '@project-tracker/core/store';
import { join } from 'node:path';
import type { V1Lot, V1Ticket, V1Usage } from './files';

/** An attachment and the V1 file to copy; `path` is relative to the database folder. */
export interface AttachmentCopy extends AttachmentRecord {
  source: string;
}

export function toAttachments(ticket: V1Ticket): AttachmentCopy[] {
  const key = ticket.item.id;
  return ticket.item.attachments.map((attachment) => ({
    id: `${key}/${attachment.id}`,
    ticketId: key,
    path: `attachments/${key}/${attachment.file}`,
    mime: attachment.type,
    createdAt: attachment.at,
    source: join(ticket.folder, 'attachments', attachment.file),
  }));
}

/** A V1 lot only keeps the tickets that were migrated. */
export function toDeliveryBatch(lot: V1Lot, ticketIds: ReadonlySet<string>): DeliveryBatchRecord {
  return {
    id: lot.id,
    name: lot.title,
    deliveredAt: `${lot.date}T00:00:00.000Z`,
    ticketIds: (lot.itemIds ?? []).filter((id) => ticketIds.has(id)),
  };
}

/** One row per model; the ticket is the one that held the conversation, when V1 knew it. */
export function toUsage(line: V1Usage, ticketIds: ReadonlySet<string>): StoredUsage[] {
  const held = line.attribution === 'held' ? line.items[0]?.split(':')[1] : undefined;
  return line.models.map((model, index) => {
    const usage: StoredUsage = {
      id: `${line.id}/${String(index + 1)}`,
      model: model.model,
      inputTokens: model.input,
      outputTokens: model.output,
      cacheReadTokens: model.cacheRead,
      cacheWriteTokens: model.cacheWrite5m + model.cacheWrite1h,
      provenance: 'measured',
      at: line.at,
    };
    if (held !== undefined && ticketIds.has(held)) usage.ticketId = held;
    return usage;
  });
}
