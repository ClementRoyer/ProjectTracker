# 0033. La priorité ordonne toutes les demandes back-end

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (« ok pour toutes les demandes »)
- Liens : complète [ADR 0021](0021-suites-du-poc-reseau-et-lanceur.md) et [ADR 0032](0032-niveaux-de-priorite.md)

## Contexte

L'ADR 0021 ne faisait jouer la priorité que lorsque plusieurs demandes back-end attendent le même fichier tenu. En l'écrivant (ADR 0032), l'IA a appliqué le même ordre à toutes les demandes en attente, et l'a soumis à l'utilisateur.

## Options étudiées

| Option | Effet |
|---|---|
| **Toutes les demandes** (proposé) | Le lanceur prend toujours la demande du ticket le plus prioritaire, puis la plus ancienne |
| Seulement à fichier tenu libéré | Ordre d'arrivée, sauf entre demandes qui attendaient le même fichier |

## Décision

**Toutes les demandes en attente** sont prises par priorité du ticket, puis par ancienneté. Une nouvelle demande d'un ticket urgent passe devant des demandes plus anciennes de tickets normaux.

## Conséquences

- Une seule règle d'ordre pour le lanceur, déjà en place.
- Un ticket de priorité basse peut attendre longtemps si d'autres demandes arrivent sans cesse ; le développeur le voit dans l'attente affichée et peut relever sa priorité.
