# 0030. Installation dans un projet, branchement de Claude Code, sauvegarde à la mise à jour

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (questions posées au lancement de l'étape 11)
- Liens : [plan de l'étape 11](../plan/etape-11.md) ; [ADR 0003](0003-build-a-la-release.md), [0011](0011-interface-des-agents.md), [0013](0013-base-par-projet-et-sauvegarde.md), [0024](0024-migration-des-donnees-v1.md)

## Contexte

L'étape 11 livre l'outil dans les projets de l'utilisateur et fait passer ses trackers V1 en V2. L'ADR 0013 place l'outil et sa base dans `tools/tracker/` de chaque projet et laisse ouverte la sauvegarde avant une mise à jour. Il faut choisir comment l'outil arrive dans un projet, comment Claude Code y est branché, et quand la base est sauvegardée.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Installer et mettre à jour | **Commande depuis ce dépôt**, qui copie l'artefact dans le projet (recommandé) ; archive npm installée globalement | Commande depuis ce dépôt |
| 2. Brancher Claude Code | **Réglages du projet** : `.claude/settings.json` et `.mcp.json` écrits par l'installation (recommandé) ; plugin installé une fois pour l'utilisateur | Réglages du projet |
| 3. Sauvegarde avant une mise à jour | **Automatique à la mise à jour** (recommandé) ; manuelle seulement, avec un rappel | Automatique |

## Décision

1. **Une commande d'installation, depuis ce dépôt.** `npm run build` produit `dist/`, avec le numéro de version. `node dist/install.js --root <projet>` copie le serveur, la CLI, la page et les scripts de Claude Code dans `<projet>/tools/tracker/app/`, crée la configuration (port au choix) si elle manque et ignore par git la base, les sauvegardes, le jeton et `app/`. Relancée sur un projet déjà installé, la même commande le met à jour : la configuration et les données restent.
2. **Claude Code est branché par les réglages du projet.** L'installation ajoute à `.claude/settings.json` les hooks de l'adaptateur (début de session, début de tour, fin de tour) et l'adresse du tracker du projet, et à `.mcp.json` le MCP en HTTP. Ce qui appartient déjà au projet dans ces fichiers est gardé. Le compte rendu d'installation donne aussi l'adresse MCP et la commande de la CLI, pour les autres agents (Codex, OpenCode…).
3. **La mise à jour sauvegarde la base d'abord**, dans `tools/tracker/backups/`, avant de toucher à quoi que ce soit, et dit où est la copie. Le reste du temps, la sauvegarde reste manuelle (ADR 0013) : une commande de sauvegarde, à chaud, et une commande de restauration, serveur arrêté.

## Conséquences

- Pas de registre npm : l'utilisateur garde ce dépôt pour installer et mettre à jour.
- Chaque projet a sa propre copie de l'outil, à sa version ; une mise à jour se fait projet par projet.
- Le plugin Claude Code de `dist/claude-plugin` reste utile pour les essais (`--plugin-dir`), mais l'installation ne l'utilise pas.
- La migration d'un tracker V1 (ADR 0024) passe par la même commande, sur un projet sans base V2.
