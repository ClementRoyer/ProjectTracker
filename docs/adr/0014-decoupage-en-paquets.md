# 0014. Découpage du code en paquets

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (réponses aux deux questions du 2026-10-19)
- Liens : [ADR 0002](0002-perimetre-multi-agents-ouvert.md) (adaptateurs), [0003](0003-build-a-la-release.md) (TypeScript, build), [0008](0008-eviter-les-conflits-entre-tickets.md) (chevauchements), [0010](0010-back-end-intervenant-du-ticket.md) (lanceur), [0011](0011-interface-des-agents.md) (serveur unique) ; [architecture.md](../architecture.md) §2.5

## Contexte

La V2 est un dépôt TypeScript compilé à la release (ADR 0003). Les ADR 0007 à 0013 font apparaître plusieurs programmes : le serveur, la CLI, la page, le lanceur back-end, l'adaptateur Claude Code et l'installeur. Il faut décider comment ranger le code et quelles frontières faire respecter.

## Options étudiées

### Granularité

| Option | Avantages | Inconvénients |
|---|---|---|
| Un paquet par responsabilité : `domain`, `app`, `store`, `jira`, `contract`, `server`, `cli`, `web`, `launcher`, `adapter-claude`, `install` (proposition de l'IA) | Frontières gardées par les dépendances entre paquets | Onze paquets, beaucoup de frontières à maintenir |
| **Moins de paquets** : `domain`, `app`, `store` (et `jira`) réunis dans un paquet `core` | Moins de paquets et de configuration | Les frontières internes de `core` ne sont plus gardées par npm ; il faut une règle de vérification |

### Lecture des fichiers modifiés (chevauchements, ADR 0008)

| Option | Avantages | Inconvénients |
|---|---|---|
| **La CLI de l'agent rapporte** les fichiers modifiés, le serveur compare | Le serveur n'exécute jamais de commande | Retard possible tant qu'un agent n'a rien rapporté |
| Le serveur lance `git` en lecture dans chaque dossier de travail | Toujours à jour | Exception à la règle « le serveur n'exécute jamais de commande » |

## Décision

| Question | Choix de l'utilisateur |
|---|---|
| Granularité | **Moins de paquets** : `domain`, `app` et `store` réunis dans `core` |
| Fichiers modifiés | **La CLI rapporte** (proposition de l'IA) |

Paquets retenus (workspaces npm, sans autre outil de monorepo) :

| Paquet | Rôle | Ne fait jamais |
|---|---|---|
| **core** | Dossiers internes : `domain` (notions du glossaire et règles, code pur), `usecases` (cas d'usage), `store` (SQLite, migrations, sauvegarde), `jira` (chargement en lecture seule) | Rien de propre à HTTP ou à MCP |
| **contract** | Formes des données échangées : API HTTP, outils MCP, événements. Partagé par tous les autres paquets, y compris la page | De la logique |
| **server** | Seul processus qui ouvre la base. API HTTP, flux d'événements, MCP en HTTP, page compilée, contrôle des jetons (page, conversation, lanceur) | Exécuter une commande |
| **cli** | Client mince de l'API, plus les actions sur la machine de l'agent : commit (ADR 0009), reconstruction de l'aperçu, préparation d'un dossier de travail, `resource run`, rapport des fichiers modifiés | Ouvrir la base |
| **web** | La page Svelte | — |
| **launcher** | Lanceur du serveur back-end (ADR 0010), livré à part, Node seul | Recevoir une commande |
| **adapter-claude** | Ce qui est propre à Claude Code : présentation de la conversation, relevé d'usage, channel, secours par Monitor, réglage d'attribution | — |
| **install** | Installation, mise à jour, migration d'un tracker V1 (schéma 4) vers SQLite | — |

Règles de dépendance, vérifiées automatiquement :
- Dans `core`, `domain` n'importe rien d'autre ; `store` et `jira` n'importent que `domain` ; `usecases` importe les trois.
- Seul `server` importe `core`.
- Les autres paquets ne parlent au serveur qu'à travers `contract` et l'API HTTP.

Chevauchements : la CLI envoie la liste des fichiers modifiés d'un dossier de travail à chaque commit fait par l'outil et sur demande ; le serveur compare les listes des tickets en cours.

## Conséquences

- La vérification d'architecture (successeur de `check.mjs`) garde les frontières internes de `core`.
- La détection des chevauchements dépend des rapports de la CLI : un ticket qui n'a encore rien commité ni rapporté n'y figure pas. La page affiche la date du dernier rapport.
- Le lanceur et l'adaptateur Claude Code n'importent que `contract` : ils restent légers à livrer.
