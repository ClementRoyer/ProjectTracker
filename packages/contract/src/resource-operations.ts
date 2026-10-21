import { z } from 'zod';
import { defineOperation } from './operation';
import { ticketKey } from './ticket';

const resourceInput = z.object({
  key: ticketKey,
  resource: z.string().describe('Une ressource déclarée dans la configuration, par exemple e2e'),
});

export const acquireResource = defineOperation({
  name: 'acquireResource',
  description:
    'Demande une ressource partagée pour le ticket (par exemple les tests e2e) : elle est donnée, ou le ticket attend son tour. Préfère la commande « tracker resource run », qui garde le verrou pendant la commande.',
  callers: ['developer', 'agent'],
  input: resourceInput,
  output: z.object({
    granted: z.boolean(),
    leaseUntil: z.string().nullable(),
    heldBy: z.string().nullable().describe('Le ticket qui tient la ressource, si elle est prise'),
    position: z.number().describe('Place dans la file ; 0 quand la ressource est donnée'),
  }),
});

export const renewResource = defineOperation({
  name: 'renewResource',
  description:
    'Renouvelle le verrou d’une ressource tenue ; sans renouvellement, il tombe après 60 s.',
  callers: ['developer', 'agent'],
  input: resourceInput,
  output: z.object({ leaseUntil: z.string() }),
});

export const releaseResource = defineOperation({
  name: 'releaseResource',
  description: 'Rend une ressource partagée, ou quitte sa file ; le ticket suivant la reçoit.',
  callers: ['developer', 'agent'],
  input: resourceInput,
  output: z.object({ released: z.boolean() }),
});

export const resourceOperations = [acquireResource, renewResource, releaseResource] as const;
