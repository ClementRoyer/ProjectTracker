/** The due date and the size of a ticket, for the suggestion of what to take next (ADR 0038). */
export const dueDateAndSize = `
ALTER TABLE ticket ADD COLUMN dueDate TEXT;
ALTER TABLE ticket ADD COLUMN size TEXT CHECK (size IN ('small', 'medium', 'large'));
`;
