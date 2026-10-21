/** Who acts. An agent acts through one conversation (`sessionId`, ADR 0011). */
export type Actor = { kind: 'developer' } | { kind: 'agent'; agentId: string; sessionId?: string };
