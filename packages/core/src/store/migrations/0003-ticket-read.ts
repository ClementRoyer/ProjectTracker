/** When the developer last read each ticket, for its unread mark (ADR 0029). */
export const ticketRead = `
CREATE TABLE ticketRead (
  ticketId TEXT PRIMARY KEY REFERENCES ticket (id),
  readAt TEXT NOT NULL
);
`;
