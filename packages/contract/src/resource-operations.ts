import { z } from 'zod';
import { defineOperation } from './operation';
import { ticketKey } from './ticket';

const resourceInput = z.object({
  key: ticketKey,
  resource: z.string().describe('A resource declared in the configuration, for example e2e'),
});

export const acquireResource = defineOperation({
  name: 'acquireResource',
  description:
    'Asks for a shared resource for the ticket (for example the e2e tests): it is granted, or the ticket waits its turn. Prefer the "tracker resource run" command, which keeps the lock during the command.',
  callers: ['developer', 'agent'],
  input: resourceInput,
  output: z.object({
    granted: z.boolean(),
    leaseUntil: z.string().nullable(),
    heldBy: z.string().nullable().describe('The ticket holding the resource, if it is taken'),
    position: z.number().describe('Place in the queue; 0 when the resource is granted'),
  }),
});

export const renewResource = defineOperation({
  name: 'renewResource',
  description: 'Renews the lock of a held resource; without renewal, it expires after 60 s.',
  callers: ['developer', 'agent'],
  input: resourceInput,
  output: z.object({ leaseUntil: z.string() }),
});

export const releaseResource = defineOperation({
  name: 'releaseResource',
  description: 'Releases a shared resource, or leaves its queue; the next ticket gets it.',
  callers: ['developer', 'agent'],
  input: resourceInput,
  output: z.object({ released: z.boolean() }),
});

export const resourceOperations = [acquireResource, renewResource, releaseResource] as const;
