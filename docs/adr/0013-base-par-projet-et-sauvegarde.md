# 0013. Une base par projet, dans le dépôt, sauvegardée à la main

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (réponses aux deux questions du 2026-10-19)
- Liens : [ADR 0004](0004-stockage-sqlite.md) (SQLite), [0008](0008-eviter-les-conflits-entre-tickets.md) (dossiers de travail), [0011](0011-interface-des-agents.md) (serveur unique) ; [needs.md](../product/needs.md) (multi-projets en bonus)

## Contexte

La V1 installe l'outil dans chaque projet (`tools/tracker/`, ignoré par git), avec ses fichiers de données, et sauvegarde dans `tools/tracker/backups/` avant chaque mise à jour. Le multi-projets est un bonus (« 95 % du temps ce sera un projet »). Avec les dossiers de travail (ADR 0008), plusieurs dossiers du même dépôt travaillent en même temps.

## Options étudiées

### Emplacement

| Option | Avantages | Inconvénients |
|---|---|---|
| Une base par développeur, dans son dossier personnel | Un seul serveur pour tous les projets ; multi-projets sans effort ; rien dans le dépôt | L'outil vit loin du projet |
| **Une base par projet, dans le dépôt** (V1) | Tout ce qui concerne le projet reste au même endroit | Un serveur et un port par projet ; le multi-projets demande d'agréger plusieurs bases |

L'IA recommandait la base par développeur. L'utilisateur a choisi la base par projet.

### Sauvegarde

| Option | Avantages | Inconvénients |
|---|---|---|
| Copies automatiques datées | Protège sans y penser | Du code et de la place en plus |
| Copies + export lisible | Données récupérables sans l'outil | Encore plus de code et de place |
| **Manuelle seulement** | Le plus simple | Rien ne protège contre un oubli |

L'IA recommandait les copies automatiques. L'utilisateur a choisi la sauvegarde manuelle.

## Décision

| Question | Choix de l'utilisateur |
|---|---|
| Emplacement | **Une base par projet, dans le dépôt** |
| Sauvegarde | **Manuelle seulement** |

Fonctionnement retenu :
- L'outil et sa base vivent dans le **dossier principal du projet** (`tools/tracker/`, ignoré par git), comme en V1.
- **Les dossiers de travail n'ont pas de base** : leurs agents joignent le serveur du projet en HTTP (ADR 0011). Aucun ne lit ni n'écrit la base directement.
- **Un serveur par projet**, sur un port configuré par projet.
- **Une commande de sauvegarde** fait une copie cohérente de la base (sauvegarde SQLite à chaud, possible pendant que le serveur tourne) dans `tools/tracker/backups/`, et une commande de restauration la remet en place. Rien n'est sauvegardé automatiquement.

## Conséquences

- Le multi-projets (bonus) suppose plusieurs serveurs ; une vue commune, si elle est faite un jour, devra les interroger. Ce n'est pas prévu pour l'instant.
- La sauvegarde avant une mise à jour de l'outil sera tranchée avec la procédure de mise à jour.
