# Glossaire

- Statut : **validé par l'utilisateur (2026-10-18)**
- Date : 2026-10-18
- Sources : [needs.md](needs.md), [features.md](features.md), ambiguïtés relevées dans l'[audit produit](../analysis/2026-10-16-audit-v1/product.md) §3

## Règles

- **Un mot par notion, une notion par mot.** Les documents, l'interface, les messages des agents et le code emploient ces termes et aucun autre.
- **Colonne « Code »** : le nom utilisé dans le code, en anglais ([ADR 0006](../adr/0006-langues.md)).
- **Colonne « Remplace (V1) »** : les mots de la V1 qui ne doivent plus être employés pour cette notion.

## Personnes et intervenants

| Terme | Code | Définition | Remplace (V1) |
|---|---|---|---|
| **Développeur** | `developer` | La personne qui utilise l'outil. Il traite des tickets, rapporte ce qu'il apprend, répond aux questions, livre et valide en qualité. C'est le seul à déclarer un ticket terminé. | « l'utilisateur », « page » comme auteur |
| **Agent** | `agent` | Un intervenant d'IA, identifié par un nom stable. Il peut porter plusieurs tickets et appartenir à n'importe quel outil (Claude Code ou un autre). | owner, label, `--agent` |
| **Conversation** | `session` | Une exécution concrète d'un agent. Elle peut s'arrêter, et une nouvelle conversation peut reprendre un ticket. | session (au sens d'identité) |
| **Intervenant** | `assignee` | Celui qui traite un ticket : le développeur ou un agent. Un ticket a au plus **un intervenant par rôle** à la fois ([ADR 0010](../adr/0010-back-end-intervenant-du-ticket.md)). | owner, détenteur, celui qui a « réservé » |
| **Rôle** | `role` | La part du travail d'un ticket que tient un intervenant : `front` (le dépôt du projet) ou `back-end` (le miroir sur le serveur back-end). | — |
| **Partenaire** | `partner` | Un acteur extérieur avec qui on échange au sujet d'un ticket. Le back-end n'en est plus un : c'est un intervenant de rôle `back-end`. | partenaire (ne désigne plus le back-end) |
| **Utilisateur final** | `endUser` | Une personne qui utilise le produit développé : elle teste en qualité et fait des retours. Ne pas confondre avec le développeur. | « user », « utilisateur » sans précision |

## Le ticket

| Terme | Code | Définition | Remplace (V1) |
|---|---|---|---|
| **Projet** | `project` | Un ensemble de tickets, rattaché à un dépôt de code. Le cas normal est un seul projet. | — |
| **Ticket** | `ticket` | L'unité de travail suivie. Tout se rattache à un ticket. | item, carte, card, tâche (`kind: task`) |
| **Origine** | `origin` | D'où vient le ticket : `jira` (chargé depuis Jira) ou `local` (créé dans l'outil, et il le reste). | — |
| **Clé** | `key` | L'identifiant lisible d'un ticket : la clé Jira (`ABC-123`) ou une clé locale. | id, ticket id |
| **Demande initiale** | `initialRequest` | Ce qui a été demandé au départ : la description Jira, ou la phrase qui a créé le ticket local. | description, contexte |
| **Statut Jira** | `jiraStatus` | Le statut du ticket dans Jira, affiché tel quel. Distinct de la phase. | issueStatus |

## La situation d'un ticket

| Terme | Code | Définition | Remplace (V1) |
|---|---|---|---|
| **Situation** | `situation` | Où en est un ticket, en quatre éléments : **phase**, **avancement**, **attente** et **intervenant**. | stage, column, standing, status, activity (cinq mots pour une notion) |
| **Phase** | `phase` | L'étape du cycle de vie, dans cet ordre : **À faire** (`todo`, ticket pas encore commencé) → **Analyse** (`analysis`) → **Développement** (`development`) → **Test** (`test`) → **Livraison en qualité** (`qaDelivery`) → **Validation en qualité** (`qaValidation`). | stage, colonne |
| **Avancement** | `progress` | Où on en est dans la phase : **pas démarré** (`notStarted`), **en cours** (`inProgress`, avec une phrase qui dit où), **fait** (`done`). | activity, standing |
| **Attente** | `wait` | Ce que le ticket attend pour avancer, et depuis quand : le développeur, un autre intervenant (le back-end), un partenaire, un utilisateur final, une ressource, un fichier tenu. Aucune attente = le ticket peut avancer. | blockedBy, blocking, waiting |
| **Terminé** | `closed` | L'état final, déclaré par le développeur seul, après la validation en qualité. | done (colonne) |
| **Sans nouvelles** | `stale` | Un ticket en cours dont rien n'a bougé depuis un délai configurable. | noNews, standing `noNewsAt` |

## Le dossier du ticket

| Terme | Code | Définition | Remplace (V1) |
|---|---|---|---|
| **Journal** | `journal` | La suite datée de tout ce qui s'est passé sur un ticket, en texte intégral. Chaque élément est une **entrée**. | history, events, messages, exchanges, notes (huit flux) |
| **Entrée** | `entry` | Un élément du journal, avec un auteur, une date et un **type** (ci-dessous). Une entrée n'est jamais modifiée : on la corrige par une entrée plus récente. | event, message, note, memory |
| **Type d'entrée** | `entryType` | `progress` (point d'avancement : fait, en cours, reste, pièges), `decision` (une décision et sa raison), `exchange` (un échange entre intervenants ou avec un partenaire, mot pour mot), `feedback` (un retour d'un utilisateur final), `question`, `answer`, `request`, `situationChange` (changement de situation), `testRun` (un passage de test), `jiraImport` (ce qu'a apporté un chargement Jira). | — |
| **Fiche** | `sheet` | La lecture du ticket en trois temps : la demande initiale, l'histoire jusqu'à la prise en main, la situation aujourd'hui. Elle est construite à partir du journal et sert aussi bien au développeur qu'à un agent qui reprend le ticket. | brief, brief.md, fiche |

## Échanger avec le développeur

| Terme | Code | Définition | Remplace (V1) |
|---|---|---|---|
| **Question** | `question` | Une demande d'un intervenant **au développeur**, avec le contexte, les options et une recommandation. Tant qu'elle est ouverte, le ticket attend le développeur. | question (inchangé) |
| **Réponse** | `answer` | La réponse du développeur à une question. Elle est acheminée à l'intervenant, qui en accuse réception. | answer |
| **Demande** | `request` | Une action demandée **par le développeur** à un intervenant : « Où en est-on ? », relancer les tests… | request stockée comme une answer, action, statusRequest, rerun |
| **Prise en compte** | `acknowledgement` | La confirmation que l'intervenant a reçu une réponse ou une demande. | accusé, claim d'une réponse |
| **À traiter** | `inbox` | Tout ce qui attend le développeur : questions ouvertes, validations, demandes d'action, du plus ancien au plus récent. | « ce qui m'attend », vue « Tout » |
| **Nouveautés** | `updates` | Ce qui a changé depuis la **dernière visite** (`lastVisit`) du développeur : nouveaux tickets, mises à jour Jira, travail des agents. | notifications, « Nouveau » |

## Jira

| Terme | Code | Définition | Remplace (V1) |
|---|---|---|---|
| **Chargement Jira** | `jiraImport` | Lecture des tickets Jira assignés au développeur sur le projet, lancée par lui. Elle apporte la demande initiale, le statut et les commentaires. Elle n'écrit jamais dans Jira. | issue tracker sync, refresh |
| **Écart Jira** | `jiraDrift` | Une différence entre le statut Jira et la phase locale, simplement affichée. | gap, mismatch |

## Travailler en parallèle

| Terme | Code | Définition | Remplace (V1) |
|---|---|---|---|
| **Prise en charge** | `assignment` | Le fait de devenir l'intervenant d'un ticket. Elle reste valable tant que l'intervenant donne des signes de vie. | claim, lease, réservation |
| **Fichier tenu** | `fileHold` | Un fichier déclaré par l'intervenant d'un ticket avant de le modifier. Un autre ticket ne peut pas le modifier pendant ce temps. | hold, files |
| **Priorité** | `priority` | L'ordre d'importance d'un ticket, réglé par le développeur : urgente (`urgent`), haute (`high`), normale (`normal`, par défaut), basse (`low`) (ADR 0032). Quand plusieurs demandes attendent le même fichier tenu, celle du ticket le plus prioritaire passe en premier (ADR 0021). | — |
| **Ressource partagée** | `resource` | Un bien utilisé par un seul ticket à la fois, par exemple l'environnement de tests e2e. | — |
| **Verrou** | `lock` | L'usage exclusif d'une ressource partagée pendant une opération. Le mot est réservé à cet usage. | lock (aussi employé pour les fichiers de données) |
| **Dossier de travail** | `worktree` | Le dossier git propre à un ticket, avec sa branche, où son intervenant travaille sans gêner les autres tickets ([ADR 0008](../adr/0008-eviter-les-conflits-entre-tickets.md)). Optionnel : un ticket peut aussi être traité dans le dossier principal. | — |
| **Chevauchement** | `overlap` | Un risque de conflit détecté : deux tickets ont modifié le même fichier. C'est un signal, pas un blocage. | overlap (même mot, sens précisé) |
| **Demande back-end** | `backendRequest` | Une demande adressée au rôle `back-end` d'un ticket, par l'agent front ou par le développeur. Le ticket attend alors le back-end. | message au partenaire back-end |
| **Lanceur** | `launcher` | Le petit programme de l'outil installé sur le serveur back-end. Il relève les demandes back-end et démarre un agent neuf pour chacune, avec la commande configurée. Il gère les fichiers tenus du miroir par des fichiers `.lock` locaux. | — |
| **Exécution** | `execution` | Le passage d'un agent démarré par le lanceur pour une demande back-end, du lancement à la fin. Les fichiers qu'il tient sont libérés à la fin de l'exécution. | — |
| **Conflit** | `conflict` | Deux tickets qui veulent le même fichier ou la même ressource au même moment. | overlap |
| **Garde** | `guard` | Le contrôle qui refuse une action interdite avant qu'elle ait lieu : écrire un fichier tenu par un autre ticket, utiliser une ressource sans son verrou. | guard (inchangé) |

## Terminer et livrer

| Terme | Code | Définition | Remplace (V1) |
|---|---|---|---|
| **Passage de test** | `testRun` | Une exécution de tests pour un ticket, avec son résultat (réussi, échoué) et sa date. | run, campaign |
| **Test manuel** | `manualTest` | Un test fait à la main : **visuel** (par le développeur) ou **utilisateur** (par un utilisateur final), avec son retour. | — |
| **Livraison** | `delivery` | Un ensemble de tickets livrés ensemble en qualité, puis validés. | lot (au sens de livraison), delivery |
| **Changelog** | `changelog` | Le texte qui décrit une livraison, produit en option. | — |
| **Modèle** | `template` | Un fichier gabarit du projet, servant à générer un export. | — |
| **Export** | `export` | Un fichier généré pour un ticket à partir d'un modèle. | — |

## Autour du projet

| Terme | Code | Définition | Remplace (V1) |
|---|---|---|---|
| **Usage** | `usage` | La consommation estimée de l'IA, par ticket et par période (jour, semaine, mois). | coût, costs |
| **Pièce jointe** | `attachment` | Un fichier attaché à un ticket : capture d'écran ou autre. | capture d'écran, screenshot |
| **Dépôt** | `repository` | Un dépôt de code du projet. | repo |
| **Groupe** | `group` | Un regroupement libre de tickets, par exemple un thème. | lot (au sens de regroupement) |
| **Document** | `document` | Un document de référence du projet, consultable depuis l'outil. | doc |

## Mots à ne plus employer

| Mot V1 | Problème | À la place |
|---|---|---|
| item, carte | Deux noms pour le ticket | **Ticket** |
| tâche (`kind: task`) | Les « tâches du développeur » de la V1 ne correspondent à aucun besoin | Supprimé (décision de l'utilisateur, 2026-10-18) |
| stage, column, standing, status, activity | Cinq mots pour « où en est-il ? » | **Situation** (phase, avancement, attente, intervenant) |
| blockedBy | Mélangé avec le statut | **Attente** |
| claim, lease, hold, reservation | Recouvrements | **Prise en charge**, **fichier tenu**, **verrou** |
| listener, dispatcher, aiguilleur | Mécanisme d'un seul outil d'agents | Notion technique, hors du vocabulaire du domaine |
| capture | Brut d'un hook | Notion technique ; le résultat est une **entrée** `exchange` |
| memory, brief | Doublons du journal et de la fiche | **Entrée** et **fiche** |
| lot | Désignait trois choses | **Livraison**, **groupe**, et « étape du plan » pour le développement de l'outil |

## Décisions de l'utilisateur (2026-10-18)

| Question | Réponse | Effet |
|---|---|---|
| Code en anglais, interface et documents en français ? | « Oui. » | [ADR 0006](../adr/0006-langues.md) |
| « Fiche » pour la lecture en trois temps ? | « OK pour fiche. » | Terme retenu |
| Supprimer les « tâches » de la V1 ? | « Oui, supprime. » | La notion disparaît |
| Une phase avant l'analyse ? | « Oui, un truc du style. » | Phase **À faire** (`todo`) ajoutée en tête du cycle |
