# 0015. Modèle de données : état courant et journal immuable

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (réponses aux deux questions du 2026-10-19)
- Liens : [glossaire](../product/glossary.md) (noms des notions et codes) ; [features.md](../product/features.md) ; [ADR 0004](0004-stockage-sqlite.md), [0007](0007-acheminement-des-reponses.md) à [0014](0014-decoupage-en-paquets.md) ; [architecture.md](../architecture.md) §2.6

## Contexte

La V1 range un ticket dans huit flux distincts (history, events, messages, exchanges, notes…) et dans plusieurs fichiers d'état, protégés par des verrous maison. Le glossaire a fixé une notion unique : le **journal**, fait d'**entrées** jamais modifiées. La V2 stocke tout dans une base SQLite par projet (ADR 0004, 0013), ouverte par le seul serveur (ADR 0011).

## Options étudiées

| Option | Avantages | Inconvénients |
|---|---|---|
| **État courant + journal**, écrits dans la même transaction | Lectures simples et rapides ; histoire complète | Une incohérence ne peut venir que d'un bug d'un cas d'usage (couvert par les tests) |
| Tout dérivé du journal (event sourcing) | Une seule source de vérité | Projections, rejeu et évolution des types d'événements : trop complexe pour un outil local mono-utilisateur |

## Décision

**État courant + journal** (proposition de l'IA), et le modèle ci-dessous, acceptés par l'utilisateur.

### Règles générales

- Le **journal** (`entry`) n'est jamais modifié ni effacé : des déclencheurs SQLite refusent `UPDATE` et `DELETE`. Une correction est une nouvelle entrée.
- Chaque cas d'usage écrit l'état courant et l'entrée du journal **dans la même transaction**.
- Les noms de tables et de colonnes reprennent les codes du glossaire. Dates en ISO 8601 UTC. Identifiants textuels.
- Les **jetons** ne sont stockés que hachés. Le **prix des modèles** est dans la configuration, pas dans la base (ADR 0012).
- Le schéma évolue par migrations numérotées, de façon additive tant que possible.

### Tables

| Table | Colonnes principales | Notes |
|---|---|---|
| `ticket` | `id`, `key`, `origin` (`jira`/`local`), `title`, `initialRequest`, `jiraUrl`, `jiraStatus`, `groupId`, `createdAt`, `closedAt` | `key` unique |
| `situation` | `ticketId`, `phase`, `progress`, `progressNote`, `waitKind`, `waitSince`, `waitDetail`, `updatedAt` | Une ligne par ticket. L'attente est **calculée** pour ce qui vient de l'outil (question ouverte, demande back-end, file de ressource, fichier tenu) et **déclarée** pour l'extérieur (utilisateur final, partenaire) |
| `entry` | `id`, `ticketId`, `entryType`, `authorKind` (`developer`/`agent`/`jira`/`launcher`/`system`), `sessionId`, `role`, `body` (texte intégral), `data` (JSON), `replyTo`, `createdAt` | Le journal, immuable |
| `agent` | `id`, `name`, `tool` | `name` unique, stable |
| `session` | `id`, `agentId`, `tokenHash`, `startedAt`, `lastSeenAt`, `endedAt` | La conversation (ADR 0011) |
| `assignment` | `ticketId`, `role` (`front`/`backend`), `assigneeKind` (`developer`/`agent`), `agentId`, `sessionId`, `since`, `releasedAt` | Un intervenant actif par rôle et par ticket (index unique partiel sur `releasedAt IS NULL`) |
| `question` | `entryId`, `ticketId`, `options` (JSON), `recommendation`, `status` (`open`/`answered`), `answerEntryId` | Le texte est dans l'entrée |
| `delivery` | `entryId` (réponse ou demande), `ticketId`, `role`, `sessionId`, `deliveredAt`, `acknowledgedAt` | Acheminement et prise en compte (ADR 0007) |
| `backendRequest` | `id`, `ticketId`, `entryId`, `status` (`pending`/`taken`/`running`/`done`/`failed`/`unreachable`), `createdAt` | ADR 0010 |
| `execution` | `id`, `requestId`, `launcherId`, `startedAt`, `endedAt`, `outcome`, `undeclaredChanges` | Un passage d'agent back-end |
| `launcher` | `id`, `name`, `tokenHash`, `lastSeenAt`, `heldFiles` (JSON, indicatif) | Signes de vie et fichiers tenus annoncés |
| `worktree` | `ticketId`, `path`, `branch`, `lastReportAt` | ADR 0008 |
| `changedFile` | `ticketId`, `path`, `reportedAt` | Rapportés par la CLI (ADR 0014) ; les chevauchements en sont déduits |
| `fileHold` | `ticketId`, `path`, `sessionId`, `since` | Dossier principal, F34 |
| `resource`, `resourceLock`, `resourceQueue` | `name` ; `resource`, `ticketId`, `sessionId`, `leaseUntil` ; `resource`, `ticketId`, `queuedAt` | Verrou avec bail et file d'attente |
| `testRun` | `id`, `ticketId`, `kind` (`auto`/`visual`/`user`), `result`, `note`, `at` | F17, F24 |
| `usage` | `id`, `sessionId`, `ticketId` (vide si aucun), `model`, `inputTokens`, `outputTokens`, `cacheReadTokens`, `cacheWriteTokens`, `provenance` (`measured`/`declared`), `at` | ADR 0012 |
| `deliveryBatch`, `deliveryBatchTicket` | `id`, `name`, `deliveredAt`, `validatedAt`, `changelog` ; lien vers les tickets | Lot de livraison en qualité, F19, F22 |
| `attachment` | `id`, `ticketId`, `path`, `mime`, `createdAt` | Fichiers à côté de la base |
| `group`, `document` | `id`, `name` ; `id`, `title`, `path` | Secondaires |
| `preview` | `builtAt`, `tickets` (JSON), `conflicts` (JSON) | Dernier aperçu reconstruit (ADR 0009) |
| `developer` | `lastVisitAt` | Les nouveautés (F9) sont les entrées postérieures |
| `jiraImport` | `id`, `at`, `summary` (JSON) | Chaque chargement ; le détail est aussi dans le journal |

## Conséquences

- Les nouveautés, l'historique et la fiche se lisent dans le journal ; la vue d'ensemble et « ce qui m'attend » se lisent dans les tables d'état courant.
- La migration depuis la V1 (paquet `install`) transforme les huit flux en entrées typées et reconstruit les tables d'état.
- Les tests des cas d'usage vérifient que l'état courant et le journal restent cohérents.
