import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Call, HookContext } from './hooks';

/** The tracker of the project: TRACKER_URL, else the default port on the loopback (ADR 0011). */
export function hookContext(env: Readonly<Record<string, string | undefined>>): HookContext {
  const url = (env.TRACKER_URL ?? 'http://127.0.0.1:9620').replace(/\/+$/, '');
  const call: Call = async (operation, input, token) => {
    const response = await fetch(`${url}/api/${operation}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`${operation} : ${String(response.status)}`);
    return await response.json();
  };
  return {
    call,
    env,
    stateDir:
      env.TRACKER_STATE_DIR ?? join(homedir(), '.cache', 'project-tracker', 'claude-sessions'),
  };
}

export function readHookInput(): unknown {
  return JSON.parse(readFileSync(0, 'utf8'));
}
