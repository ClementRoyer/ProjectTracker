# 0032. Niveaux de priorité d'un ticket

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur
- Liens : [ADR 0021](0021-suites-du-poc-reseau-et-lanceur.md) (la priorité départage les demandes back-end), [0024](0024-migration-des-donnees-v1.md) (priorité V1 écartée en attendant), [0028](0028-page-svelte.md) ; [glossaire](../product/glossary.md) `priority`

## Contexte

L'ADR 0021 a créé la priorité du ticket, réglée par le développeur : quand plusieurs demandes back-end attendent le même fichier tenu, celle du ticket le plus prioritaire passe en premier. Les niveaux et la valeur par défaut restaient à fixer, ainsi que la reprise des priorités que l'outil connaît déjà (Jira, V1) et leur place dans la page.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Niveaux | 3 : haute, normale, basse (recommandé) ; **4 : urgente, haute, normale, basse** ; 5, comme Jira | 4 niveaux (choix de l'utilisateur contre la recommandation) |
| 2. Ticket chargé de Jira | **Reprise à la création** (recommandé) ; toujours suivre Jira ; ignorer Jira | Reprise à la création |
| 3. Priorité des tickets V1 | **Convertie à la migration** (recommandé) ; non reprise | Convertie |
| 4. Place dans la page | **Discrète, sauf si écartée de « normale »** (recommandé) ; toujours visible | Discrète |

## Décision

- **Quatre niveaux**, du plus au moins prioritaire : urgente (`urgent`), haute (`high`), normale (`normal`), basse (`low`). **Par défaut : normale.**
- **Jira** : au premier chargement d'un ticket, sa priorité Jira donne la valeur de départ ; ensuite elle n'appartient qu'au développeur, un chargement suivant ne l'écrase jamais. Rien n'est écrit dans Jira.
- **V1** : la migration convertit la priorité V1 ; un ticket V1 sans priorité prend « normale ».
- **Conversion de l'échelle à cinq niveaux** de Jira et de la V1, proposée par l'IA : Highest → urgente ; High → haute ; Medium → normale ; Low et Lowest → basse ; un nom inconnu (priorité Jira personnalisée) → normale.
- **Page** : une marque sur la ligne et la carte quand la priorité n'est pas « normale », un tri « Priorité » dans la liste, un choix dans l'en-tête du ticket pour la changer. Chaque changement est noté au journal.
- **Demandes back-end** (ADR 0021) : à fichier tenu libéré, la demande du ticket le plus prioritaire passe en premier ; à priorité égale, la plus ancienne.

## Conséquences

- Migration de la base : une colonne `priority` sur `ticket`, « normale » pour les tickets existants.
- Une opération `setPriority` réservée au développeur ; les agents voient la priorité dans le résumé du ticket.
- Le client Jira lit aussi le champ `priority` (lecture seule).
