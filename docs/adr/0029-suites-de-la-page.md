# 0029. Suites de la page : dossier, nouveautés, devise, livraison

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (points ouverts de l'étape 10, après la démo de la page)
- Liens : [plan de l'étape 10](../plan/etape-10.md) ; [ADR 0012](0012-mesure-de-l-usage-ia.md), [0015](0015-modele-de-donnees.md), [0028](0028-page-svelte.md) ; [features.md](../product/features.md) F9, F19, F20

## Contexte

La page a été écrite d'après la maquette validée. Quatre points n'avaient pas de réponse dans la maquette ou dans le modèle de données ; ils ont été soumis à l'utilisateur après qu'il a validé la page.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Rubriques « Fait », « Reste », « Pièges » du dossier, sans donnée | Les ajouter au journal, rapportées par l'agent (recommandé) ; les retirer | **Les retirer** |
| 2. Effacement du point « nouveautés » | Ticket par ticket, à l'ouverture (recommandé) ; un bouton « tout marquer lu » | Ticket par ticket |
| 3. Devise du coût estimé | Une clé dans la configuration (recommandé) ; pas de devise | Devise dans la configuration |
| 4. Tickets proposés pour la prochaine livraison en qualité | Phase « Test » avec avancement « fait » (proposé par l'IA) ; tous les tickets en « Test » | Phase « Test », avancement « fait » |

## Décision

1. **Le dossier ne montre que ce que le modèle connaît** : demande initiale, où on en est, décisions, dernier passage de tests, fichiers en commun, lien Jira. Les rubriques de la maquette sont retirées (choix de l'utilisateur contre la recommandation de l'IA).
2. **Nouveautés ticket par ticket.** Ouvrir un ticket efface son point, et seulement le sien. La base garde une date de dernière lecture par ticket ; la liste des nouveautés (F9) garde sa propre date de visite.
3. **Devise dans la configuration** : une clé `currency` (code ISO 4217, par exemple `USD` ou `EUR`) à côté de la table de prix. La page affiche le coût dans cette devise ; sans la clé, elle l'affiche sans symbole.
4. **Prochaine livraison** : les tickets ouverts en phase « Test » dont l'avancement est « fait ».

## Conséquences

- Migration 3 de la base : une table de lecture par ticket.
- Une opération `markTicketRead` (développeur), appelée par la page à l'ouverture d'un ticket et quand de nouvelles entrées y arrivent pendant qu'il est ouvert.
- `usageSummary` rend la devise configurée.
