# 0043. Commande de commit

- Statut : Acceptée
- Date : 2026-10-21
- Décideur : l'utilisateur (réponses du 2026-10-21)
- Liens : met en œuvre l'[ADR 0009](0009-apercu-et-commits-des-dossiers-de-travail.md) (commande de commit, attribution désactivée) ; [ADR 0041](0041-dossier-de-travail-par-ticket.md) (dossiers de travail) ; [plan de l'étape 16](../plan/etape-16.md)

## Contexte

L'ADR 0009 a retenu une commande de commit fournie par l'outil, utilisable par tout agent, qui applique la convention du projet sans mention de co-auteur, l'auteur étant le développeur. Elle a aussi retenu que l'installation désactive l'attribution automatique de Claude Code, et que les commits d'un ticket pourront être regroupés. Restaient à dire : qui écrit le message, quels fichiers entrent, quelle trace sur le ticket, et quand faire le regroupement.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Message | **l'agent écrit, l'outil vérifie** (recommandé) ; l'outil compose à partir d'un type ; aucune vérification | L'agent écrit, l'outil vérifie |
| 2. Fichiers | **tout dans un dossier de ticket, l'indexé dans le dossier principal** (recommandé) ; toujours l'indexé ; toujours tout | Tout dans un dossier de ticket |
| 3. Trace | **note au journal du ticket** (recommandé) ; clé dans le message ; aucune | Note au journal |
| 4. Regroupement | **plus tard, avec la livraison** (recommandé) ; maintenant | Plus tard |

## Décision

1. **Commande** : `tracker commit "<message>" [--ticket <CLÉ>]`, lancée par un agent ou le développeur, sur sa machine ; le serveur n'exécute rien.
2. **Message** : écrit par l'agent. L'outil retire les lignes de co-auteur et « Generated with », puis refuse un message qui ne tient pas sur une ligne de 72 caractères au plus. Avec la règle gitmoji (par défaut), il refuse aussi un message qui ne commence pas par un emoji suivi d'une espace. La configuration peut l'enlever : `"commit": { "gitmoji": false }`.
3. **Auteur** : celui de la configuration git, donc le développeur. Aucune mention de l'agent.
4. **Fichiers** : dans `.worktrees/<CLÉ>`, tout ce qui a changé, dans chaque dépôt touché, avec le même message. Dans le dossier principal, partagé entre tickets, seulement ce qui est déjà indexé. Rien à commiter est refusé.
5. **Trace** : le ticket est celui de `--ticket`, sinon celui du dossier `.worktrees/<CLÉ>`. Son journal reçoit « Commit a1b2c3d : <message> » (avec le dépôt quand il y en a plusieurs). Sans ticket connu, le commit se fait sans note. La clé n'entre pas dans le message ; la branche `ticket/<CLÉ>` la porte.
6. **Attribution** : l'installation règle `attribution` à vide (commits et PR) dans `.claude/settings.json` du projet, s'il n'est pas déjà réglé. Le retrait de l'outil le laisse : c'est aussi la consigne du développeur.
7. **Regroupement** : avec l'étape de livraison, qui réunira la branche du ticket dans la branche principale.

## Conséquences

- Pas d'opération nouvelle : la note passe par `recordEntry`.
- La configuration gagne `commit` : `{ "gitmoji": true }`, facultatif.
- Les consignes données à l'agent en début de session citent la commande.
