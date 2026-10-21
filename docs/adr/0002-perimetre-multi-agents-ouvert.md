# 0002. Périmètre V2 : local, multi-agents ouvert

- Statut : Acceptée
- Date : 2026-10-16
- Décideur : l'utilisateur (réponse à la question « Quel périmètre produit vises-tu pour la nouvelle version ? »)
- Liens : [audit produit](../analysis/2026-10-16-audit-v1/product.md) §6

## Contexte

La V1 est entièrement liée à Claude Code : hooks, outil Monitor pour l'écoute, SendMessage et sous-agents pour l'aiguillage, format du transcript pour le coût. Plusieurs de ces dépendances reposent sur des champs non documentés. Elles doivent être revérifiées à chaque mise à jour de Claude Code.

## Options étudiées

1. **Local, mono-utilisateur, lié à Claude Code** : on structure et on élague sans changer la nature du produit.
2. **Local, multi-agents ouvert** : toujours un seul développeur sur sa machine, mais le cœur est découplé de Claude Code. Les agents passent par une interface neutre (serveur MCP et CLI), et Claude Code devient un adaptateur parmi d'autres (Codex, Cursor, OpenCode…).
3. **Multi-utilisateurs, équipe** : serveur partagé, identités, droits, synchronisation entre machines. Change profondément l'architecture.

## Décision

**Option 2 : multi-agents ouvert.**

## Conséquences

- Le domaine (items, questions, réponses, réservations…) ne connaît aucun runtime d'agent.
- Une **interface MCP** devient l'entrée principale des agents. La CLI reste pour les scripts et les hooks. Les deux appellent les mêmes cas d'usage.
- Tout ce qui est propre à Claude Code passe dans un **adaptateur** : hooks, écoute via Monitor, coût depuis le transcript, captures, garde. On profite du passage pour réévaluer les mécanismes chers ou fragiles.
- L'**identité d'un agent** (agent, session, runtime) devient un vrai concept du domaine, au lieu d'un nom de session complété par `--agent`.
- Hors périmètre : plusieurs utilisateurs humains, la synchronisation entre machines.
