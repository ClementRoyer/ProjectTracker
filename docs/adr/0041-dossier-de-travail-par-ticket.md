# 0041. Dossier de travail par ticket

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (réponses du 2026-10-20)
- Liens : met en œuvre l'[ADR 0008](0008-eviter-les-conflits-entre-tickets.md) (dossier par ticket, préparation configurable) ; [ADR 0014](0014-decoupage-en-paquets.md) (la CLI lit git, le serveur jamais) ; [ADR 0040](0040-depots-groupes-documents.md) (plusieurs dépôts) ; [plan de l'étape 14](../plan/etape-14.md)

## Contexte

L'ADR 0008 a retenu un dossier de travail par ticket (git worktree), recommandé et non obligatoire, avec une commande de préparation propre au projet. Reste à dire où le créer, sur quelle branche, comment l'agent y retrouve l'outil, et ce qu'il devient à la clôture.

Difficulté relevée : dans un dossier de travail, les fichiers de l'outil ignorés par git (`tools/tracker/app/`, `developer.token`) n'existent pas. Les hooks Claude Code et la CLI ne trouveraient plus l'outil.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Emplacement | à côté du projet, `../<projet>-<CLÉ>` (recommandé) ; **dans le projet, `.worktrees/<CLÉ>`, ignoré** ; réglable | Dans le projet, ignoré |
| 2. Branche | **modèle réglable, ou branche existante** (recommandé) ; toujours `<CLÉ>` ; toujours donnée à la main | Modèle réglable, ou existante |
| 3. Accès à l'outil depuis le dossier | **liens symboliques** (recommandé) ; retrouver le projet principal par git | Liens symboliques |
| 4. À la clôture | **commande de retrait** (recommandé) ; retrait par l'agent ; rien | Commande de retrait |

## Décision

1. **Créer** : `tracker worktree add <CLÉ> [--branch <branche>] [--base <branche>]`, lancée par le développeur ou un agent, jamais par la page. Le dossier est `.worktrees/<CLÉ>` à la racine du projet. `.worktrees/` est exclu de git localement (`.git/info/exclude`), sans toucher au `.gitignore` du projet.
2. **Branche** : `--branch`, sinon le modèle `worktree.branch` de la configuration (par défaut `ticket/{key}`). Si la branche existe, le dossier la reprend (cas d'une branche commune) ; sinon elle est créée depuis la base (`--base`, sinon `main`).
3. **Plusieurs dépôts** (ADR 0040) : un dossier de travail par dépôt, rangés sous `.worktrees/<CLÉ>/<chemin du dépôt>`, sur la même branche. Les fichiers modifiés se rapportent depuis `.worktrees/<CLÉ>` comme depuis la racine.
4. **Accès à l'outil** : la commande lie, dans le dossier, `tools/tracker/app` et `tools/tracker/developer.token` à ceux du projet principal, ainsi que `tools/tracker/tracker.config.json`, `.mcp.json` et `.claude/settings.json` s'ils n'y sont pas déjà (fichiers non commités). Hooks, MCP et CLI marchent sans changement. Linux et macOS.
5. **Préparer** : la commande lance ensuite `worktree.setup` de la configuration s'il est donné (installer les dépendances, copier les fichiers d'environnement…), dans le dossier, sur la machine de l'intervenant. Le serveur n'exécute toujours rien.
6. **Le ticket connaît son dossier** (chemin et branche) : le dossier du ticket l'affiche.
7. **Retirer** : `tracker worktree remove <CLÉ>` retire le dossier, refusé par git s'il reste des changements non commités ; la branche est gardée. La page signale le dossier encore présent d'un ticket clos.

## Conséquences

- Opérations nouvelles : noter le dossier de travail d'un ticket, l'oublier.
- La configuration gagne `worktree` : `{ "branch": "ticket/{key}", "setup": "npm ci" }`, les deux facultatifs.
- Le coût réel de préparation sur le projet de l'utilisateur (R7) reste à mesurer au premier essai.
- L'aperçu par branche d'intégration (ADR 0009) et la commande de commit restent à faire.
