/** The start or end of work an agent signals on the ticket it holds (ADR 0028). */
export const workSignal = `
ALTER TABLE assignment ADD COLUMN workState TEXT CHECK (workState IN ('started', 'finished'));
ALTER TABLE assignment ADD COLUMN workStateAt TEXT;
`;
