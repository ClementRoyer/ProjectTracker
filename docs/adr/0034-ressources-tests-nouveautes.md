# 0034. Ressources partagées, passages de tests, écran des nouveautés

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (lancement de l'étape 12)
- Liens : [ADR 0008](0008-eviter-les-conflits-entre-tickets.md) (volet 2 : ressources partagées) ; [features.md](../product/features.md) F9, F16, F17 ; [plan de l'étape 12](../plan/etape-12.md)

## Contexte

Trois fonctionnalités primaires restent incomplètes après les étapes 9 à 11 : le verrou des ressources partagées (F16), le résultat des tests d'un ticket (F17) et « ce qui a changé depuis ma dernière visite » (F9), dont l'opération existe sans écran. L'ADR 0008 fixe le principe du verrou (`tracker resource run e2e -- <commande>`, attente « ressource » visible) mais pas sa durée ni la liste des ressources.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Ressources connues de l'outil | **Déclarées dans la configuration** (recommandé) ; créées au premier usage | Déclarées |
| 2. Libération après un arrêt brutal | **Bail renouvelé** : 60 s, renouvelé toutes les 20 s (recommandé) ; durée maximale fixe | Bail renouvelé |
| 3. Nouveautés dans la page | **Écran « Nouveautés »** (recommandé) ; panneau sur la liste ; les points bleus suffisent | Écran |

## Décision

1. **Les ressources sont déclarées** dans la configuration du projet (`resources`, par exemple `["e2e"]`). Un nom inconnu est refusé.
2. **Verrou à bail renouvelé.** `tracker resource run <ressource> --key <ticket> -- <commande>` demande la ressource pour le ticket, attend son tour dans la file (le ticket montre alors l'attente « ressource »), lance la commande **sur la machine de l'agent**, renouvelle le bail toutes les 20 s, puis rend la ressource et sort avec le code de la commande. Sans renouvellement pendant 60 s, le verrou tombe et le suivant de la file passe. Le serveur n'exécute jamais la commande. La prise et la remise sont notées au journal du ticket.
3. **Passage de tests** : les agents (et le développeur) enregistrent un passage, automatique, visuel ou utilisateur, réussi ou non, avec une note ; le dossier montre le dernier.
4. **Écran « Nouveautés »** : un lien dans l'en-tête avec leur nombre ; l'écran les groupe par ticket, chacune ouvre son ticket ; « Tout marquer vu » les efface.

## Conséquences

- Opérations nouvelles : demande, renouvellement et remise d'une ressource ; enregistrement d'un passage de tests.
- La file d'une ressource suit l'ordre d'arrivée.
- Le point « nouveautés » de chaque ticket (ADR 0029) et l'écran ont chacun leur date de visite : lire un ticket n'efface pas l'écran, et l'inverse.
