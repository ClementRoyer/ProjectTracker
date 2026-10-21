# 0023. Accès à la base : SQL écrit à la main sur node:sqlite

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (« ok SQL à la main, go »)
- Liens : [ADR 0004](0004-stockage-sqlite.md) (SQLite), [0015](0015-modele-de-donnees.md) (modèle), [0016](0016-stack-serveur-et-validation.md) (Zod), [0018](0018-outillage-et-code-v1.md) (Node 22.13+)

## Contexte

L'étape 8 écrit `core/store`. Il faut choisir comment le code parle à la base.

## Options étudiées

| Option | Avantages | Inconvénients |
|---|---|---|
| **SQL à la main** sur `node:sqlite` (recommandé) | Aucune dépendance ; SQL lisible et relu tel quel ; les déclencheurs du journal immuable s'écrivent de toute façon en SQL | Types des lignes à écrire et à valider soi-même |
| Kysely | Requêtes typées par le compilateur, SQL visible | Une dépendance ; branchement sur `node:sqlite` à vérifier |
| Drizzle | Schéma, types et migrations au même endroit | Plus lourd ; prise en charge de `node:sqlite` récente ; déclencheurs en SQL quand même |

## Décision

**SQL écrit à la main**, avec le module `node:sqlite` de Node (sans dépendance).

- Les **migrations** sont des fichiers SQL numérotés, appliqués dans l'ordre au démarrage ; le numéro atteint est gardé dans `PRAGMA user_version`. Chaque migration s'applique dans une transaction.
- Les requêtes sont **paramétrées** (`?` ou `:nom`), jamais construites par concaténation de valeurs.
- Une ligne lue est convertie en type du domaine par une fonction du store ; les colonnes JSON sont validées par Zod.
- Réglages à l'ouverture : clés étrangères actives, journal WAL, délai d'attente si la base est occupée.

## Conséquences

- `core/store` ne dépend que de `node:sqlite`, de Zod et de `core/domain`.
- Les tests du store tournent sur une base en mémoire (`:memory:`), sans fichier.
