# 0039. Plusieurs projets : un sélecteur

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (sous-étape 13f)
- Liens : [features.md](../product/features.md) F25 ; [ADR 0013](0013-base-par-projet-et-sauvegarde.md), [0030](0030-installation-dans-un-projet.md)

## Contexte

F25 : passer d'un projet à l'autre. L'ADR 0013 donne à chaque projet son serveur, sa base et son port ; rien ne relie aujourd'hui les projets d'une même machine.

## Options étudiées

| Option | Pour | Contre |
|---|---|---|
| **Sélecteur de projet** (recommandé) | Garde l'ADR 0013 tel quel | On ne voit pas ce qui attend dans les autres projets |
| Sélecteur et nombre de décisions par projet | Vue d'ensemble | Une question publique, sans jeton, sur chaque serveur |
| Un seul serveur pour tous les projets | Une seule page | Remet en cause l'ADR 0013 |

## Décision

- **L'installation note chaque projet** (son nom, son adresse, sa racine) dans un registre de la machine : `~/.config/project-tracker/projects.json`. Le retour arrière vers la V1 l'en retire.
- **Un menu « Projet »** dans l'en-tête, quand la machine en a plusieurs, liste ceux dont le serveur répond et ouvre leur page. Chaque projet garde son serveur, sa base et son jeton.
- Le nom d'un projet est le nom de son dossier.

## Conséquences

- Le serveur lit le registre et vérifie, pour la page, quels serveurs répondent (sur leurs adresses locales).
- Un projet installé avant cette décision n'apparaît qu'après une nouvelle installation (mise à jour).
