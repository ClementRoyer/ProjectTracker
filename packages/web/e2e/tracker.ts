import type { APIRequestContext } from '@playwright/test';

/** The developer token the server wrote into the page (ADR 0027). */
async function developerToken(request: APIRequestContext): Promise<string> {
  const page = await (await request.get('/')).text();
  return /name="tracker-token" content="([^"]+)"/.exec(page)?.[1] ?? '';
}

async function post(
  request: APIRequestContext,
  operation: string,
  input: object,
  token: string | null,
): Promise<unknown> {
  const response = await request.post(`/api/${operation}`, {
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
    data: input,
  });
  return response.json();
}

/** Calls an operation as the developer. */
export async function developerCall(
  request: APIRequestContext,
  operation: string,
  input: object,
): Promise<unknown> {
  return post(request, operation, input, await developerToken(request));
}

/** Creates a local ticket and returns its key. */
export async function createTicket(request: APIRequestContext, title: string): Promise<string> {
  const created = (await developerCall(request, 'createTicket', { title })) as { key: string };
  return created.key;
}

/** A new agent conversation; its calls carry its own token. */
export async function agent(
  request: APIRequestContext,
  name: string,
): Promise<(operation: string, input: object) => Promise<unknown>> {
  const { token } = (await post(request, 'introduce', { name }, null)) as { token: string };
  return (operation, input) => post(request, operation, input, token);
}
