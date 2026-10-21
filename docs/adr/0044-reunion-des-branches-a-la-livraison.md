# 0044. Réunion des branches à la livraison

- Statut : Acceptée
- Date : 2026-10-21
- Décideur : l'utilisateur (réponses du 2026-10-21)
- Liens : met en œuvre l'[ADR 0008](0008-eviter-les-conflits-entre-tickets.md) (« la livraison en qualité comprend la réunion des branches des tickets du lot ») et le regroupement des commits de l'[ADR 0009](0009-apercu-et-commits-des-dossiers-de-travail.md) ; [ADR 0037](0037-changelog-de-livraison.md) (changelog) ; [ADR 0043](0043-commande-de-commit.md) (commit) ; [plan de l'étape 17](../plan/etape-17.md)

## Contexte

La livraison en qualité (F19) est déjà notée par la page : un lot de tickets passe en « livraison en qualité », et le changelog est écrit s'il est activé. Mais les branches des tickets, depuis les dossiers de travail (ADR 0041), ne sont réunies nulle part. L'ADR 0008 l'a prévu ; l'ADR 0009 a ouvert la possibilité de regrouper les commits d'un ticket à ce moment-là.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Où vont les branches | **dans la base, sans pousser** (recommandé) ; dans une branche `delivery/<nom>` ; rien côté git | Dans la base, sans pousser |
| 2. Forme des commits | **un commit par ticket** (recommandé) ; garder les commits ; au choix à chaque livraison | Un commit par ticket |
| 3. Conflit | **tout ou rien** (recommandé) ; laisser le ticket de côté | Tout ou rien |
| 4. Page | **elle donne la commande** (recommandé) ; deux temps (noter, puis réunir) | Elle donne la commande |

## Décision

1. **Commande** : `tracker deliver "<nom>" <CLÉ>… [--base <branche>] [--keep <CLÉ>]`, lancée par le développeur dans le dossier principal (noter une livraison lui est réservé) ; jamais par la page ni le serveur.
2. **Avant de réunir** : chaque dépôt du dossier principal doit être sur la base (`--base`, sinon `TRACKER_BASE`, sinon `main`), sans changement suivi en cours. Les tickets doivent exister et être ouverts.
3. **Branche d'un ticket** : celle de son dossier de travail, sinon celle du modèle (`ticket/{key}`) si elle existe. Un ticket sans branche, ou dont la branche n'a rien de plus que la base, n'a rien à réunir : il est seulement noté dans la livraison.
4. **Un commit par ticket** : les commits de la branche sont regroupés (`merge --squash`) en un seul, avec le message du premier commit de la branche, au nom du développeur. `--keep <CLÉ>` garde les commits de ce ticket (réunion `--no-ff`, message « 🔀 Merge <branche> »).
5. **Plusieurs dépôts** : la même chose dans chaque dépôt où la branche a quelque chose.
6. **Tout ou rien** : au premier conflit, ou si la livraison est refusée par le serveur, chaque dépôt revient où il était ; la commande nomme le ticket et les fichiers en conflit. Rien n'est noté.
7. **Ensuite** : la commande note la livraison (`deliverBatch`). Si le changelog est activé et que son fichier est dans un dépôt, elle le commite (« 📝 Update changelog for <nom> »).
8. **Rien n'est poussé.** Branches et dossiers de travail restent ; `tracker worktree remove` les retire après la clôture.
9. **Page** : quand un ticket choisi a un dossier de travail, la page montre la commande à copier à la place du bouton. Sans dossier, le bouton reste.

## Conséquences

- Pas d'opération nouvelle : la CLI lit les tickets et leurs dossiers, puis note la livraison avec `deliverBatch`.
- Un ticket livré garde sa branche ; s'il a encore un dossier, l'aperçu le réunit à nouveau, sans effet puisque son code est déjà dans la base.
