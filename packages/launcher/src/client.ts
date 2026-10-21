import { request } from 'node:http';

/** Calls an operation of the tracker; every connection leaves the back-end server (ADR 0010). */
export type CallTracker = (
  operation: string,
  input: unknown,
  signal?: AbortSignal,
) => Promise<unknown>;

export function trackerClient(target: {
  url: string;
  token: string;
  proxy?: string | undefined;
}): CallTracker {
  return async (operation, input, signal) => {
    const url = `${target.url.replace(/\/+$/, '')}/api/${operation}`;
    const body = JSON.stringify(input);
    const headers = { authorization: `Bearer ${target.token}`, 'content-type': 'application/json' };
    const answer = target.proxy
      ? await throughProxy(new URL(target.proxy), url, { headers, body, signal })
      : await fetch(url, { method: 'POST', headers, body, ...(signal ? { signal } : {}) }).then(
          async (response) => ({ status: response.status, text: await response.text() }),
        );
    if (answer.status !== 200) {
      throw new Error(`${operation} : ${String(answer.status)} ${answer.text}`);
    }
    return JSON.parse(answer.text) as unknown;
  };
}

/** Through an HTTP proxy, the request line carries the full URL. */
function throughProxy(
  proxy: URL,
  url: string,
  options: { headers: Record<string, string>; body: string; signal?: AbortSignal | undefined },
): Promise<{ status: number; text: string }> {
  return new Promise((resolve, reject) => {
    const sent = request(
      {
        host: proxy.hostname,
        port: proxy.port,
        method: 'POST',
        path: url,
        headers: { ...options.headers, host: new URL(url).host },
        ...(options.signal ? { signal: options.signal } : {}),
      },
      (response) => {
        let text = '';
        response.on('data', (chunk: Buffer) => (text += chunk.toString()));
        response.on('end', () => {
          resolve({ status: response.statusCode ?? 500, text });
        });
      },
    );
    sent.on('error', reject);
    sent.end(options.body);
  });
}
