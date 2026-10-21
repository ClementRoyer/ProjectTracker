/** Business refusals of the server (HTTP 409), said in English to the developer. */
const REFUSALS: Readonly<Record<string, string>> = {
  ticketNotFound: 'This ticket does not exist.',
  emptyTitle: 'The title is empty.',
  emptyBody: 'The message is empty.',
  ticketClosed: 'The ticket is closed.',
  alreadyInPhase: 'The ticket is already in this phase.',
  progressNoteRequired: 'Say where the work stands.',
  onlyDeveloperCloses: 'Only the developer declares a ticket closed.',
  notValidated: 'Possible after a QA validation is done.',
  batchNotFound: 'This delivery does not exist.',
  alreadyValidated: 'This delivery is already validated.',
  roleTaken: 'Another assignee already holds this role.',
  questionNotFound: 'This question does not exist.',
  questionAnswered: 'This question already has its answer.',
  jiraNotConfigured:
    'Jira is not configured: add "jira" to the configuration file, and its environment variables.',
  jiraUnreachable: 'Jira does not answer. Nothing was loaded.',
  tooLarge: 'File too big: 20 MB at most.',
  jiraOwnsDueDate: 'The due date of a Jira ticket comes from Jira.',
  attachmentNotFound: 'This attachment does not exist on this ticket.',
};

export function refusalText(code: string): string {
  return REFUSALS[code] ?? `Refused by the server (${code}).`;
}
