import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { openDatabase } from '@project-tracker/core/store';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createApp } from '../src/app';
import { parseConfig } from '../src/config';

const DEVELOPER = 'developer-token-for-tests';
const HOST = '127.0.0.1:9620';
const clients: Client[] = [];
afterEach(async () => {
  for (const client of clients.splice(0)) await client.close();
});

type App = ReturnType<typeof createApp>;

const setUp = (): App => {
  const config = parseConfig({});
  if (!config.ok) throw new Error(config.error);
  return createApp({
    db: openDatabase(':memory:'),
    config: config.value,
    developerToken: DEVELOPER,
  });
};

/** An MCP client that reaches the app without a network. */
const connect = async (app: App, headers: Record<string, string> = {}): Promise<Client> => {
  const client = new Client({ name: 'test-agent', version: '0.0.0' });
  const transport = new StreamableHTTPClientTransport(new URL(`http://${HOST}/mcp`), {
    fetch: (url, init) => {
      const merged = new Headers(init?.headers);
      merged.set('host', HOST);
      for (const [name, value] of Object.entries(headers)) merged.set(name, value);
      return Promise.resolve(app.request(String(url), { ...init, headers: merged }));
    },
  });
  // The SDK types `sessionId` without `| undefined`, which our exactOptionalPropertyTypes rejects.
  await client.connect(transport as unknown as Transport);
  clients.push(client);
  return client;
};

const text = (result: Awaited<ReturnType<Client['callTool']>>): string =>
  z
    .array(z.object({ type: z.literal('text'), text: z.string() }))
    .parse(result.content)
    .map((part) => part.text)
    .join('\n');

const tokenIn = (reply: string): string => /Token: (\S+)/.exec(reply)?.[1] ?? '';

const developerCall = async (app: App, operation: string, body: unknown): Promise<unknown> => {
  const response = await app.request(`/api/${operation}`, {
    method: 'POST',
    headers: {
      host: HOST,
      authorization: `Bearer ${DEVELOPER}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return response.json();
};

const questionOn = async (app: App, agent: Client): Promise<string> => {
  await developerCall(app, 'createTicket', { title: 'Search by customer name' });
  await agent.callTool({ name: 'introduce', arguments: { name: 'front-1' } });
  const asked = text(
    await agent.callTool({ name: 'askQuestion', arguments: { key: 'LOC-1', text: 'Which rule?' } }),
  );
  return z.object({ questionId: z.string() }).parse(JSON.parse(asked.split('\n')[0] ?? '{}'))
    .questionId;
};

describe('MCP over HTTP (ADR 0011, 0007, 0020)', () => {
  it('offers the operations open to agents, and the wait, but not those of the developer', async () => {
    const tools = (await (await connect(setUp())).listTools()).tools.map((tool) => tool.name);
    expect(tools).toEqual(
      expect.arrayContaining(['introduce', 'reportProgress', 'askQuestion', 'waitForInbox']),
    );
    expect(tools).not.toContain('closeTicket');
    expect(tools).not.toContain('answerQuestion');
  });

  it('asks a conversation to introduce itself before anything else', async () => {
    const result = await (await connect(setUp())).callTool({ name: 'listTickets', arguments: {} });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/introduce/);
  });

  it('ties the MCP session to the conversation once it introduced itself', async () => {
    const agent = await connect(setUp());
    await agent.callTool({ name: 'introduce', arguments: { name: 'front-1' } });
    const result = await agent.callTool({ name: 'listTickets', arguments: {} });
    expect(result.isError).toBeFalsy();
  });

  it('accepts the token as an argument, for a resumed conversation that opened a new MCP session', async () => {
    const app = setUp();
    const first = await connect(app);
    const token = tokenIn(
      text(await first.callTool({ name: 'introduce', arguments: { name: 'front-1' } })),
    );
    const resumed = await connect(app);
    expect(
      (await resumed.callTool({ name: 'listTickets', arguments: { token } })).isError,
    ).toBeFalsy();
  });

  it('returns a business refusal as an error with its code', async () => {
    const agent = await connect(setUp());
    await agent.callTool({ name: 'introduce', arguments: { name: 'front-1' } });
    const result = await agent.callTool({ name: 'getTicket', arguments: { key: 'NOPE-1' } });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/ticketNotFound/);
  });

  it('joins the answers waiting for the agent to its next call (pull)', async () => {
    const app = setUp();
    const agent = await connect(app);
    const questionId = await questionOn(app, agent);
    await developerCall(app, 'answerQuestion', { questionId, answer: 'Start of each word.' });
    const reply = text(await agent.callTool({ name: 'listTickets', arguments: {} }));
    expect(reply).toMatch(/Start of each word\./);
    expect(text(await agent.callTool({ name: 'listTickets', arguments: {} }))).not.toMatch(
      /Start of each word\./,
    );
  });

  it('wakes a waiting agent as soon as the developer answers', async () => {
    const app = setUp();
    const agent = await connect(app);
    const questionId = await questionOn(app, agent);
    const waiting = agent.callTool({ name: 'waitForInbox', arguments: { timeoutSeconds: 30 } });
    await new Promise((resolve) => setTimeout(resolve, 50));
    await developerCall(app, 'answerQuestion', { questionId, answer: 'Start of each word.' });
    expect(text(await waiting)).toMatch(/Start of each word\./);
  });

  it('pushes the answer through the channel to a session that asked for it, once', async () => {
    const app = setUp();
    const agent = await connect(app, { 'x-tracker-channel': 'on' });
    const pushed: string[] = [];
    agent.setNotificationHandler(
      z.object({
        method: z.literal('notifications/claude/channel'),
        params: z.object({ content: z.string() }).loose(),
      }),
      (notification) => {
        pushed.push(notification.params.content);
      },
    );
    const questionId = await questionOn(app, agent);
    await developerCall(app, 'answerQuestion', { questionId, answer: 'Start of each word.' });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(pushed.join('\n')).toMatch(/Start of each word\./);
    expect(text(await agent.callTool({ name: 'listTickets', arguments: {} }))).not.toMatch(
      /Start of each word\./,
    );
  });
});
