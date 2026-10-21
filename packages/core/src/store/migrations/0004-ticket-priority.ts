/** The priority of a ticket, set by the developer; existing tickets are normal (ADR 0032). */
export const ticketPriority = `
ALTER TABLE ticket ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'
  CHECK (priority IN ('urgent', 'high', 'normal', 'low'));
`;
