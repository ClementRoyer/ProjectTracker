# 0036. Notifications

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (sous-étape 13c)
- Liens : [features.md](../product/features.md) F26 ; [plan de l'étape 13](../plan/etape-13.md)

## Contexte

F26 : être prévenu sans garder la page sous les yeux. La V1 avait une cloche, un compteur dans le titre de l'onglet et des notifications du navigateur.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Ce qui notifie | Une question pour toi ; un ticket à déclarer terminé ; un ticket sans nouvelles ; une réponse du back-end | **Une question pour toi, une réponse du back-end** |
| 2. Forme | **Titre de l'onglet + notifications du navigateur** (recommandé) ; onglet seulement ; onglet, navigateur et son | Onglet + navigateur |

## Décision

- **Le titre de l'onglet** porte le nombre de décisions qui t'attendent : « (3) project-tracker ».
- **Une notification du navigateur** pour chaque nouvelle question qui t'est posée (par un agent front ou par le back-end) et pour chaque nouvelle réponse rapportée par le lanceur, **quand la page n'est pas au premier plan**. Un clic ouvre le ticket.
- Le navigateur demande l'accord après un clic sur « Activer les notifications » dans l'en-tête ; rien n'est demandé sans ce clic.
- Ce qui existait déjà à l'ouverture de la page ne notifie pas : seul ce qui arrive ensuite.

## Conséquences

- Tout se passe dans la page ; le serveur ne change pas.
- Une page fermée ne notifie rien : le compteur et l'écran « Nouveautés » prennent le relais à la réouverture.
