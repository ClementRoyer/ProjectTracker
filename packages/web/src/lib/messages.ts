/** Business refusals of the server (HTTP 409), said in French to the developer. */
const REFUSALS: Readonly<Record<string, string>> = {
  ticketNotFound: 'Ce ticket n’existe pas.',
  emptyTitle: 'Le titre est vide.',
  emptyBody: 'Le message est vide.',
  ticketClosed: 'Le ticket est clos.',
  alreadyInPhase: 'Le ticket est déjà dans cette phase.',
  progressNoteRequired: 'Dis où en est le travail.',
  onlyDeveloperCloses: 'Seul le développeur déclare un ticket terminé.',
  notValidated: 'Possible après une validation en qualité faite.',
  batchNotFound: 'Cette livraison n’existe pas.',
  alreadyValidated: 'Cette livraison est déjà validée.',
  roleTaken: 'Un autre intervenant tient déjà ce rôle.',
  questionNotFound: 'Cette question n’existe pas.',
  questionAnswered: 'Cette question a déjà sa réponse.',
  jiraNotConfigured:
    'Jira n’est pas configuré : ajoute « jira » au fichier de configuration et ses variables d’environnement.',
  jiraUnreachable: 'Jira ne répond pas. Rien n’a été chargé.',
  tooLarge: 'Fichier trop gros : 20 Mo au plus.',
  jiraOwnsDueDate: 'L’échéance d’un ticket Jira vient de Jira.',
  attachmentNotFound: 'Cette pièce jointe n’existe pas sur ce ticket.',
};

export function refusalText(code: string): string {
  return REFUSALS[code] ?? `Refusé par le serveur (${code}).`;
}
