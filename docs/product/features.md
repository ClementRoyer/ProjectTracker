# Fonctionnalités

- Statut : **validé par l'utilisateur (2026-10-18)**
- Date : 2026-10-18
- Source : [needs.md](needs.md), validé le 2026-10-18

## Règles de ce document

- **Chaque fonctionnalité cite les besoins qu'elle sert.** Une fonctionnalité sans besoin n'a pas sa place ici.
- **La priorité est héritée des besoins** : primaire (P) si elle sert au moins un besoin primaire, secondaire (S) sinon.
- On décrit **ce que fait** l'outil, pas **comment** il est construit. Les choix techniques relèvent de l'architecture et des ADR.

## Le ticket et son dossier

| ID | Fonctionnalité | Besoins | Prio |
|---|---|---|---|
| F1 | **Ticket** : identité, titre, origine (Jira ou local), lien vers Jira, demande initiale | B2.2, B2.4, B6.2 | P |
| F2 | **Chargement Jira à la demande** : je le lance ; il récupère les tickets qui me sont assignés sur le projet (titre, description, statut, commentaires), et signale les nouveaux et ceux qui ont changé. L'adresse et le jeton viennent d'un fichier de configuration. Rien n'est jamais écrit dans Jira. | B1.1, B1.2, B2.3, B2.4, B6.3, C1, C2 | P |
| F3 | **Création rapide d'un ticket local**, en une phrase, sans quitter ce que je fais. Il reste local. | B2.1, B2.2 | P |
| F4 | **Situation du ticket** : la phase (à faire → analyse → développement → test → livraison en qualité → validation en qualité), son avancement (pas démarrée, en cours avec où on en est, faite), l'attente éventuelle (qui, depuis quand) et l'intervenant (moi ou tel agent, un agent pouvant en porter plusieurs) | B1.3, B6.4, B7.1, B3.1, B3.3 | P |
| F5 | **Fiche du ticket**, lisible en trois temps : la demande initiale, l'histoire jusqu'à ma prise en main, la situation aujourd'hui. Elle contient aussi les décisions et leur raison, et les derniers tests. | B6.1, B6.2, B6.3, B6.4, B5.5, B8.1 | P |
| F6 | **Journal du ticket** : tout ce qui s'est passé, daté, avec son auteur (moi, un agent, Jira, le back-end), en texte intégral et jamais résumé. Les échanges avec le back-end y figurent. | B1.2, B1.4, B6.3, B6.6, B7.2, B7.3 | P |

## Alimenter le suivi

| ID | Fonctionnalité | Besoins | Prio |
|---|---|---|---|
| F7 | **Les agents tiennent le ticket à jour** : avancement, décisions, échanges, tests, questions. Cela vaut pour tout type d'agent ([ADR 0002](../adr/0002-perimetre-multi-agents-ouvert.md)), et les infos et l'analyse produites par le skill de démarrage y entrent aussi. | B1.4, B3.2, B7.3 | P |
| F8 | **Je rapporte en le disant à un agent** : un retour reçu par mail ou à l'oral, une histoire que je connais, une action que j'ai faite (livré en qualité, validé). L'agent le consigne dans le ticket. | B1.7, B7.4, B6.3 | P |

## Voir

| ID | Fonctionnalité | Besoins | Prio |
|---|---|---|---|
| F9 | **Ce qui a changé depuis ma dernière visite** : nouveaux tickets, mises à jour venues de Jira, travail fait ou terminé par les agents | B1.1, B1.2, B1.4 | P |
| F10 | **Vue d'ensemble des tickets** et de leur situation, consultée quand je le décide, sans interruption | B1.3, B4.1 | P |
| F11 | **Ticket sans nouvelles** : un ticket qui n'avance plus est signalé | B4.2 | P |
| F12 | **Ce qui m'attend** : à un seul endroit, tout ce qui attend une réponse ou une action de ma part, du plus ancien au plus récent | B1.6, B5.1 | P |

## Décider

| ID | Fonctionnalité | Besoins | Prio |
|---|---|---|---|
| F13 | **Question complète** : chaque demande qui m'est adressée porte l'historique utile, la dernière étape, le contexte, les options et une recommandation | B5.2 | P |
| F14 | **Ma réponse arrive à celui qui attend**, sans que je passe par sa conversation ; je vois qu'elle a été prise en compte, puis la suite du ticket | B5.3, B5.4 | P |

## Travailler en parallèle

| ID | Fonctionnalité | Besoins | Prio |
|---|---|---|---|
| F15 | **Reprise sans perte** : n'importe quelle nouvelle conversation reprend un ticket à partir de son dossier (F5 et F6) | B4.3 | P |
| F16 | **Pas de conflit entre tickets** : deux tickets traités en même temps ne modifient pas le même code et n'utilisent pas le même environnement partagé au même moment ; le conflit est évité ou signalé avant de se produire | B4.4 | P |

## Terminer et livrer

| ID | Fonctionnalité | Besoins | Prio |
|---|---|---|---|
| F17 | **Résultat des tests** du ticket : dernier passage, réussi ou non, date | B8.1 | P |
| F18 | **Moi seul déclare un ticket terminé** ; aucun agent ne peut le faire | B8.4 | P |
| F19 | **Lot de livraison en qualité** : je regroupe les tickets qui partent ensemble, je note la livraison puis la validation, et chaque ticket avance en conséquence | B9.1, B9.2 | P |

## Usage de l'IA

| ID | Fonctionnalité | Besoins | Prio |
|---|---|---|---|
| F20 | **Usage de l'IA**, approximatif, par ticket, et global par jour, par semaine et par mois | B10.2, B10.3 | P |

## Secondaires

| ID | Fonctionnalité | Besoins | Prio |
|---|---|---|---|
| F21 | **Proposition de la suite** : gain rapide, presque fini, échéance proche | B1.5 | S |
| F22 | **Changelog de livraison**, à activer par une option | B9.3 | S |
| F23 | **Changements de code** du ticket | B6.7 | S |
| F24 | **Tests manuels** : test visuel fait, test utilisateur fait ou non, avec son retour | B8.2, B8.3 | S |
| F25 | **Plusieurs projets** | B0.1 | S |

## Reprises de la V1 (demande de l'utilisateur, 2026-10-18)

L'IA proposait de ne pas reprendre ces fonctionnalités, faute de besoin exprimé. L'utilisateur a répondu : « Ajoute ces points que tu as trouvés de la V1, je les veux. » Elles sont **secondaires par défaut**.

| ID | Fonctionnalité | Besoins | Prio |
|---|---|---|---|
| F26 | **Notifications** : cloche des nouveautés, compteur dans le titre de l'onglet, notifications du navigateur | B11.1 | S |
| F27 | **Thèmes** (système, clair, sombre, contraste élevé) et **langue** de l'interface (français, anglais) | B11.2 | S |
| F28 | **Exports par modèle** : générer un fichier de suivi d'un ticket depuis un modèle du projet | B11.3 | S |
| F29 | **Écarts avec Jira** : signaler quand le statut Jira ne correspond pas à la situation locale (affichage seulement, sans rien écrire dans Jira) | B11.4 | S |
| F30 | **Captures d'écran et pièces jointes** sur un ticket | B11.5 | S |
| F31 | **Dépôts, lots et documents du projet** : fichiers modifiés par dépôt, regroupements de tickets, documents de référence | B11.6 | S |
| F32 | **« Où en est-on ? »** : demander un point à l'intervenant, qui répond dans le journal | B11.7 | S |
| F33 | **Messagerie entre intervenants d'un ticket** (front et back-end) : chaque échange est une entrée du journal, gardée mot pour mot et acheminée selon l'ADR 0007 ; le back-end est lancé par le lanceur ([ADR 0010](../adr/0010-back-end-intervenant-du-ticket.md)). Remplace la capture des échanges avec le back-end de la V1 | B11.8 | S |
| F34 | **Coordination explicite** : réservation d'un ticket par un intervenant, déclaration des fichiers tenus, verrou d'une ressource partagée (tests e2e), garde contre les écritures interdites. Ce sont les moyens visibles de F16. | B11.9 | S |

Les mécanismes techniques de la V1 qui les portent (hooks, format de capture, garde par regex…) seront réévalués à l'étape architecture : on garde la fonctionnalité, pas forcément sa réalisation V1.
