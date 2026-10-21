/** The changelog line of a ticket: proposed by an agent, accepted by the developer (ADR 0037). */
export const changelogLine = `
CREATE TABLE changelogLine (
  ticketId TEXT PRIMARY KEY REFERENCES ticket (id),
  proposed TEXT,
  proposedAt TEXT,
  accepted TEXT,
  acceptedAt TEXT
);
`;
