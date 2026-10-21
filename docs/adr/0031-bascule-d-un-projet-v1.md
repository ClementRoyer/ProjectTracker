# 0031. Bascule d'un projet V1 : la V1 mise de côté

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur
- Liens : [ADR 0024](0024-migration-des-donnees-v1.md), [0030](0030-installation-dans-un-projet.md) ; [plan de l'étape 11](../plan/etape-11.md)

## Contexte

La V1 occupe déjà `tools/tracker/` dans les projets, avec son propre `app/` et son propre `tracker.config.json`. Installer la V2 au même endroit écraserait des fichiers V1, ce que l'ADR 0024 interdit (« la V1 n'est jamais modifiée »). Cette collision n'avait pas été vue par l'ADR 0030.

## Options étudiées

| Option | Pour | Contre |
|---|---|---|
| **V1 mise de côté** (recommandé) : `tools/tracker/` renommé `tools/tracker-v1/`, hooks V1 retirés, V2 installée dans `tools/tracker/` et migrée depuis `tools/tracker-v1/` | Un seul outil actif ; la V2 garde l'emplacement de l'ADR 0013 ; retour arrière simple | La V1 cesse de tourner dans ce projet |
| V2 à côté, dans un autre dossier | Les deux tournent en même temps | Deux jeux de hooks dans Claude Code ; un emplacement provisoire qui dure |
| Dossier au choix, refus si une V1 est là | Rien n'est déplacé automatiquement | La bascule reste à faire à la main |

## Décision

**La V1 est mise de côté.** Sur un projet où `tools/tracker/` contient une V1, la commande d'installation :

1. retire les hooks, les commandes et le bloc `CLAUDE.md` de la V1 avec **la commande de désinstallation de la V1 elle-même** (`legacy/scripts/install.mjs --uninstall`), qui garde ses données ;
2. renomme `tools/tracker/` en `tools/tracker-v1/`, **sans rien changer dedans** ;
3. installe la V2 dans `tools/tracker/` (ADR 0030) ;
4. migre les données depuis `tools/tracker-v1/` (ADR 0024).

Si une étape échoue, ce qui a été fait est défait : le dossier V1 reprend sa place et ses hooks sont remis par la commande d'installation de la V1. Une commande de **retour arrière** fait la même chose plus tard, sur demande. `tools/tracker-v1/` se supprime à la main, quand l'utilisateur le décide.

## Conséquences

- La bascule se lance depuis ce dépôt, qui contient la V1 (`legacy/`) et la V2 (`dist/`).
- Le code de la V1 n'est pas modifié : il est seulement exécuté pour sa désinstallation et sa réinstallation.
- Un tracker V1 qui suit plusieurs projets demande l'id du projet à migrer.
