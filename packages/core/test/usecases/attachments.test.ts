import { describe, expect, it } from 'vitest';
import {
  addAttachment,
  createTicket,
  getTicket,
  identify,
  introduce,
  listInbox,
  recordEntry,
  sendMessage,
  takeTicket,
} from '../../src/usecases';
import { testContext } from './context';

const setUp = (): ReturnType<typeof testContext> => {
  const ctx = testContext();
  ctx.dataDir = '/projects/shop/tools/tracker';
  createTicket(ctx, { title: 'Fix the cut button' });
  createTicket(ctx, { title: 'Another ticket' });
  return ctx;
};

const attach = (ctx: ReturnType<typeof testContext>, key = 'LOC-1'): string => {
  const added = addAttachment(ctx, {
    key,
    id: `att-${key}`,
    path: `attachments/${key}/att-${key}-capture.png`,
    mime: 'image/png',
  });
  if (!added.ok) throw new Error(added.error);
  return added.value.id;
};

describe('attachments of a ticket (F30, ADR 0035)', () => {
  it('lists the attachments of the ticket, with their path on disk and their address', () => {
    const ctx = setUp();
    attach(ctx);
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.attachments).toMatchObject([
      {
        id: 'att-LOC-1',
        name: 'capture.png',
        mime: 'image/png',
        path: '/projects/shop/tools/tracker/attachments/LOC-1/att-LOC-1-capture.png',
        url: '/api/attachments/att-LOC-1',
      },
    ]);
  });

  it('hands the attachments of a message to the agent, with what it needs to open them', () => {
    const ctx = setUp();
    const introduced = introduce(ctx, { name: 'front-1' });
    const actor = introduced.ok ? identify(ctx, introduced.value.token) : null;
    if (!actor) throw new Error('no conversation');
    const front = { ...ctx.as(actor), dataDir: '/projects/shop/tools/tracker' };
    takeTicket(front, { key: 'LOC-1', role: 'front' });
    const id = attach(ctx);
    sendMessage(ctx, { key: 'LOC-1', to: 'front', body: 'See the capture.', attachments: [id] });
    const inbox = listInbox(front, {});
    expect(inbox.ok && inbox.value.items[0]?.attachments).toEqual([
      {
        name: 'capture.png',
        path: '/projects/shop/tools/tracker/attachments/LOC-1/att-LOC-1-capture.png',
        url: '/api/attachments/att-LOC-1',
      },
    ]);
  });

  it('keeps on the journal entry the attachments it carries', () => {
    const ctx = setUp();
    const id = attach(ctx);
    recordEntry(ctx, {
      key: 'LOC-1',
      entryType: 'feedback',
      body: 'User feedback.',
      attachments: [id],
    });
    const ticket = getTicket(ctx, { key: 'LOC-1' });
    expect(ticket.ok && ticket.value.entries.at(-1)?.data).toEqual({ attachments: [id] });
  });

  it('refuses an attachment that belongs to another ticket', () => {
    const ctx = setUp();
    const id = attach(ctx, 'LOC-2');
    expect(
      sendMessage(ctx, { key: 'LOC-1', to: 'front', body: 'Look.', attachments: [id] }),
    ).toEqual({
      ok: false,
      error: 'attachmentNotFound',
    });
  });
});
