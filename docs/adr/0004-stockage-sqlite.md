# 0004. Stockage en SQLite natif (`node:sqlite`)

- Statut : Acceptée
- Date : 2026-10-16
- Décideur : l'utilisateur (réponse à la question « Quel stockage pour les données du tracker ? »)
- Liens : [audit backend](../analysis/2026-10-16-audit-v1/backend.md) §2 et §5

## Contexte

La V1 stocke tout en fichiers JSON et JSONL (schéma 4 : `project.json`, `tickets/<ID>/item.json`, journaux, fichiers globaux `listeners.json` et `locks.json`). Pour que plusieurs agents et le serveur écrivent sans se marcher dessus, elle réimplémente une base transactionnelle :
- verrous fichiers avec détection de vie par pid ;
- intentions `.pending/` rejouées ;
- lectures « settled » avec nouvelles tentatives ;
- validation et diff du projet entier à chaque écriture.

## Options étudiées

1. **SQLite natif (`node:sqlite`)** :
   - transactions ACID, mode WAL, plusieurs processus gérés par `busy_timeout` ;
   - écritures ciblées ;
   - pas de dépendance native à distribuer ;
   - en contrepartie, les données ne sont plus lisibles ni comparables dans git.
2. **Garder les fichiers JSON** : lisibles et versionnables, mais la mini-base maison reste à maintenir.

## Décision

**Option 1 : SQLite natif.**

## Conséquences

- Node **22.13 ou plus** est requis : `node:sqlite` y est disponible sans option. Node 18 n'est plus maintenu.
- Une couche `storage` derrière une interface de dépôt de données. Les journaux en ajout seul (events, exchanges, test-runs, answers) deviennent des tables en ajout seul.
- Un **outbox d'événements** écrit dans la même transaction alimente le flux temps réel de la page, à la place de la surveillance de fichiers.
- La lisibilité est compensée par la fiche générée (`brief.md`) et une commande d'export.
- L'installeur fait une **dernière migration** des fichiers (schéma 4) vers SQLite, testée sur les fixtures existantes et vérifiée par empreintes.
- Il faudra trancher l'emplacement de la base (dans le projet ou hors du dépôt) et sa sauvegarde.
