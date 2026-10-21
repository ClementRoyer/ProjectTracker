# 0024. Migration des données V1 vers la base V2

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (réponses aux quatre questions du 2026-10-19)
- Liens : [ADR 0013](0013-base-par-projet-et-sauvegarde.md), [0014](0014-decoupage-en-paquets.md) (frontières, modifiées ici pour `install`), [0015](0015-modele-de-donnees.md) ; format V1 : `legacy/references/state-format.md` ; fixtures : `legacy/scripts/test/fixtures/`

## Contexte

Le critère de fin de l'étape 8 est une migration vérifiée sur les fixtures V1. Le format actuel de la V1 est le **schéma 4** :
- un dossier `tools/tracker/` contient **plusieurs projets** (`projects/<id>/`) ;
- chaque ticket a un `item.json`, qui contient ses questions, messages, notes, historique, décisions, mémoire, réclamation (`claim`) et fichiers ;
- quatre journaux JSONL : `events`, `answers`, `exchanges`, `test-runs` ;
- deux fichiers communs à tous les projets : `usage.jsonl` et `locks.json`.

La V1 sait déjà monter ses propres données des schémas 1 à 3 vers le 4 (`upgrade`).

Le modèle V2 est différent :
- une base par projet ;
- des phases fixes, au lieu d'étapes définies dans la configuration ;
- pas de « tâches » (supprimées le 2026-10-18) ;
- un journal unique d'entrées typées.

## Options étudiées

| Question | Proposition de l'IA | Autres options | Choix de l'utilisateur |
|---|---|---|---|
| 1. Étapes V1 → phases | Par rôle de l'étape (`doing` → développement, `deliver` → livraison en qualité…) | Tout en « À faire » | **Tout en « À faire »** |
| 2. `events.jsonl` | Écarter | Garder les changements d'étape ; tout migrer | **Écarter** |
| 3. Textes sans notion V2 (avertissements, résumé, manques, changelog…) | Une entrée « Reprise de la V1 » par ticket | Écarter | **Écarter** |
| 4. Frontière du code | `install` importe `core/store` | Migration dans `core`, lancée par `server` | **`install` importe `core/store`** |

## Décision

### Périmètre et place du code

- **Seul le schéma 4 est lu.** Une donnée plus ancienne est d'abord montée par l'`upgrade` de la V1.
- **Un projet V1 donne une base V2.** La migration prend le dossier du tracker V1 et l'id du projet.
- Le code vit dans le paquet **`install`**, qui **peut importer `core/store`** : c'est une exception à l'ADR 0014, où seul `server` ouvre `core`. La migration tourne serveur arrêté. `install` n'importe ni `usecases` ni `jira`.
- **La V1 n'est jamais modifiée.** La migration écrit une base neuve et refuse d'écraser une base existante. Elle se fait en une seule transaction : tout ou rien.
- Les fichiers V1 sont **validés par Zod** à la lecture ; un fichier invalide arrête la migration avec un message clair.
- La migration rend un **compte rendu** : ce qui a été migré et ce qui a été écarté, avec le nombre et la raison.

### Correspondances

| V1 | V2 |
|---|---|
| Carte `ticket` ou `topic` | `ticket`. La clé est l'`id` V1. L'origine est `jira` si le projet a un gestionnaire Jira et que la clé suit son motif, sinon `local`. |
| `context.request`, `context.origin` | `initialRequest` (avec l'origine en tête) |
| `kind: task` | Écartée (notion supprimée) |
| `stage` | **Ticket non terminé : phase « À faire », pas démarré.** Ticket terminé (`done`, ou `doneAt` présent) : phase « Validation en qualité » faite, et ticket **clos** à `doneAt`, pour rester conforme à la règle de clôture (ADR 0022). |
| `blockedBy: user` / `partner:<id>` + `waitingSince` | Attente `developer` / `partner` (détail : le libellé du partenaire) |
| `questions[]` | Entrée `question` (texte et contexte) + ligne `question` (options, recommandation, statut) |
| Réponses (`answers.jsonl`) | Entrée `answer` (choix et texte), liée à sa question, qui passe à « répondue ». Une réponse sans question devient une entrée `request`. Une réponse retirée n'est pas reprise. |
| `messages[]`, `notes[]`, `memory[]`, `context.history[]` | Entrées `progress` (texte intégral, date d'origine) |
| `context.decisions[]` | Entrées `decision` |
| `exchanges.jsonl` des tickets | Entrées `exchange`, mot pour mot, avec le partenaire et le sens |
| `test-runs.jsonl` | Ligne `testRun` (`auto`) + entrée `testRun` ; un passage retiré n'est pas repris |
| `attachments[]` + fichiers | Ligne `attachment` ; les fichiers sont copiés à côté de la base |
| `lots[]` | `deliveryBatch` + `deliveryBatchTicket` |
| `usage.jsonl` (lignes du projet) | `usage`, `provenance: measured` ; écriture de cache = 5 min + 1 h ; ticket = le premier de `items` si l'attribution est `held`, sinon aucun |

### Écarté

- `events.jsonl` (choix de l'utilisateur).
- Les textes sans notion V2 (choix de l'utilisateur) : `warnings[]`, `summary`, `gaps[]`, `tests{}`, `changelog[]`, `activity`, `context.recommendation`, `context.docs`, `campaigns[]`, `priority`, `repos`, `branch`.
- La coordination en direct : `claim`, `listeners.json`, `locks.json`, `fileWait`, `files[]`.
- Les fichiers techniques ou de passage : `captures`, `briefings`, `notices`, `server.json`, les enregistrements `status` de `answers.jsonl`.
- Les exchanges de projet sans ticket : la V2 n'a pas de journal hors ticket.

Le dossier V1 reste intact : il sert d'archive.

## Conséquences

- `eslint.config.js` autorise `install` à importer `@project-tracker/core/store`, et seulement lui.
- `core/store` gagne les fonctions d'écriture dont la migration a besoin (questions, passages de test, pièces jointes, livraisons, usage).
- La phase réelle des tickets en cours est à recaler à la main après la migration.
- La priorité V1 (`priority`) n'est pas reprise. Elle pourra l'être quand la priorité V2 (ADR 0021) aura ses niveaux.
