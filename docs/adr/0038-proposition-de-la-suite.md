# 0038. Proposition de la suite

- Statut : Acceptée (critères et affichage) ; la règle de classement est une proposition de l'IA, à ajuster par l'utilisateur
- Date : 2026-10-20
- Décideur : l'utilisateur (sous-étape 13e)
- Liens : [features.md](../product/features.md) F21 ; [ADR 0032](0032-niveaux-de-priorite.md) ; [plan de l'étape 13](../plan/etape-13.md)

## Contexte

F21 : l'outil suggère quoi prendre ensuite. L'utilisateur a retenu les quatre critères proposés : presque fini, priorité, échéance proche, gain rapide. Les deux derniers demandent des données que l'outil n'a pas encore : une date d'échéance et une taille.

## Décision

- **Échéance** (`dueDate`) : pour un ticket Jira, lue dans Jira (champ `duedate`, lecture seule) à chaque chargement ; pour un ticket local, réglée par le développeur.
- **Taille** (`size`) : petite, moyenne, grande ; réglée par un agent (à l'analyse) ou par le développeur, le dernier qui parle l'emporte.
- **Affichage** : un encart « À prendre ensuite » en tête de la liste, repliable, avec au plus trois tickets et, pour chacun, ses raisons.
- **Candidats** : les tickets ouverts sur lesquels personne ne travaille et qui n'attendent personne ; ce qui attend le développeur est déjà dans le triage.
- **Classement proposé par l'IA** (des points par raison, les plus forts d'abord ; un ticket sans aucune raison n'est pas proposé) :

| Raison | Points |
|---|---|
| Échéance dépassée | 50 |
| Échéance dans 2 jours ou moins | 30 |
| Échéance dans 7 jours ou moins | 15 |
| Priorité urgente / haute | 40 / 20 |
| Presque fini : en test ou plus loin | 20 |
| Gain rapide : petite taille | 15 |

## Conséquences

- La migration 6 ajoute l'échéance et la taille au ticket.
- Le classement est une règle du domaine, testée ; l'opération `suggestNext` la sert à la page.
