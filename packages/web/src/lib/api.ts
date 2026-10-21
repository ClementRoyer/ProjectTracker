import { attachment, type AttachmentView, type Operation } from '@project-tracker/contract';
import { z } from 'zod';

/** A refused business rule comes back as its code (HTTP 409); anything else is a fault and throws. */
export type Answer<T> = { ok: true; value: T } | { ok: false; error: string };

export interface Api {
  call: <I extends z.ZodType, O extends z.ZodType>(
    operation: Operation<I, O>,
    input: z.input<I>,
  ) => Promise<Answer<z.output<O>>>;
  /** Sends a file to the ticket (ADR 0035); a refusal comes back as its code. */
  upload: (key: string, file: File) => Promise<Answer<AttachmentView>>;
  /** The address of an attachment, readable by the page (the token goes in the address, like the event stream). */
  fileUrl: (url: string) => string;
  /** The projects of the machine whose tracker answers (ADR 0039). */
  projects: () => Promise<{ name: string; url: string; current: boolean }[]>;
  /** Calls `onChange` each time the server says something changed; returns how to stop. */
  listen: (onChange: () => void) => () => void;
}

const projectList = z.object({
  projects: z.array(z.object({ name: z.string(), url: z.string(), current: z.boolean() })),
});

/** The page talks to the server through the operation catalogue only, like the CLI (ADR 0026). */
export function createApi(token: string): Api {
  return {
    call: async (operation, input) => {
      const response = await fetch(`/api/${operation.name}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body: unknown = await response.json();
      if (response.status === 409) return { ok: false, error: refusalCode(body) };
      if (!response.ok) throw new Error(`${operation.name} : réponse ${String(response.status)}`);
      return { ok: true, value: operation.output.parse(body) };
    },
    upload: async (key, file) => {
      const query = `key=${encodeURIComponent(key)}&name=${encodeURIComponent(file.name || 'capture.png')}`;
      const response = await fetch(`/api/attachments?${query}`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
          'content-type': file.type || 'application/octet-stream',
        },
        body: file,
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) return { ok: false, error: refusalCode(body) };
      return { ok: true, value: attachment.parse(body) };
    },
    fileUrl: (url) => `${url}?token=${encodeURIComponent(token)}`,
    projects: async () => {
      const response = await fetch('/api/projects', {
        headers: { authorization: `Bearer ${token}` },
      });
      const body: unknown = await response.json().catch(() => null);
      const parsed = projectList.safeParse(body);
      return parsed.success ? parsed.data.projects : [];
    },
    listen: (onChange) => {
      const events = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);
      events.addEventListener('changed', onChange);
      return () => {
        events.close();
      };
    },
  };
}

/** The developer token the server wrote into the page (ADR 0027). */
export function pageToken(): string {
  const token = document.querySelector('meta[name="tracker-token"]')?.getAttribute('content');
  if (!token || token.startsWith('%')) {
    throw new Error('Jeton absent : ouvre la page servie par le serveur.');
  }
  return token;
}

function refusalCode(body: unknown): string {
  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
  ) {
    return body.error;
  }
  return 'refused';
}
