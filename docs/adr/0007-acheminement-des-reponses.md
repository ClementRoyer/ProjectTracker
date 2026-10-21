# 0007. Acheminement de la réponse du développeur à l'agent

- Statut : Acceptée
- Date : 2026-10-18
- Décideur : l'utilisateur (réponses aux trois questions du 2026-10-18)
- Liens : [features.md](../product/features.md) F14 (B5.3, B5.4, primaires), F15 ; [ADR 0002](0002-perimetre-multi-agents-ouvert.md) ; vérification de la documentation de Claude Code du 2026-10-18 (ci-dessous)

## Contexte

Le développeur répond à une question depuis l'outil. La réponse doit **arriver à l'agent qui l'attend**, sans que le développeur passe par la conversation (B5.4). Il doit aussi **voir qu'elle a été prise en compte** (B5.3).

Deux cas se présentent :
1. **La conversation qui a posé la question est encore ouverte** : il faut la « réveiller ».
2. **Elle est fermée** (arrêtée, compactée, abandonnée) : la réponse doit attendre la prochaine conversation qui reprend le ticket (F15).

La V1 traite le cas 1 avec une conversation « à l'écoute » qui surveille un flux avec l'outil Monitor (relancé avant 30 minutes) et transmet aux sous-agents. Le mécanisme fonctionne, mais il est fragile et coûteux, et il est propre à Claude Code.

### Ce que permet Claude Code (documentation officielle, vérifiée le 2026-10-18)

| Mécanisme | Ce qu'il fait | Limites |
|---|---|---|
| **Channel** (`claude/channel`) | Un serveur MCP **pousse** un message dans la session ouverte ; le modèle le reçoit au tour suivant. | **Aperçu de recherche.** Il faut lancer `claude --channels …` ; un serveur local maison exige `--dangerously-load-development-channels` (sauf s'il est publié en plugin). Fonctionne en interactif uniquement, avec une connexion claude.ai ou une clé Console. Les messages sont perdus si le channel n'est pas chargé. |
| **Monitor** | Surveille la sortie d'une commande ; chaque ligne réveille le modèle. | 30 minutes au plus (10 en `-p`), puis il faut relancer : c'est le mécanisme de la V1. |
| **Hook `asyncRewake`** | Un hook en arrière-plan réveille le modèle quand il se termine avec le code 2. | Durée maximale non documentée (600 s par défaut) ; ce n'est pas prévu pour une longue attente. |
| **Hook Stop `block`** | Empêche l'agent de s'arrêter et lui donne une raison de continuer. | Attendre dans un hook n'est pas un usage documenté. |
| **`claude -p --resume <id>`** | Ajoute un tour à une conversation enregistrée, sans interface. | Si la conversation est ouverte ailleurs, les messages s'entremêlent, sans verrou. |
| **Notification MCP classique** | — | Le modèle ne voit rien sans appel d'outil, sauf avec un channel. |
| **Messagerie entre sessions** | Remet un texte entre deux appels d'outil. | Le texte est traité comme venant d'une autre session, pas du développeur. |

Rien de tout cela n'existe de façon garantie chez les autres outils d'agents (Codex, Cursor, OpenCode).

## Options étudiées

**A. Tout en « tirer » (neutre)**
L'outil garde la réponse, et l'agent la récupère lui-même :
- à chaque appel à l'outil : toute réponse de l'outil signale « une réponse t'attend » ;
- par une commande d'attente qu'il appelle quand il n'a plus rien à faire (attente bornée, qu'il peut relancer) ;
- à la reprise du ticket.

Avantages : fonctionne avec tout agent, ne perd rien, sans mécanisme fragile. Inconvénient : un agent inactif qui n'est pas en attente ne voit la réponse qu'au prochain contact.

**B. Pousser par un channel (Claude Code)**
Le serveur de l'outil est aussi un channel. La réponse est poussée dans la conversation qui a posé la question, qui la reçoit tout de suite.

Avantages : c'est le vrai mécanisme prévu pour cet usage, la réception est immédiate, et l'utilisateur emploie déjà un channel pour joindre le back-end. Inconvénients : aperçu de recherche, option de lancement obligatoire, interactif seulement, propre à Claude Code.

**C. Surveiller par Monitor (Claude Code, comme la V1)**
L'agent lance une surveillance qui le réveille à l'arrivée d'une réponse.

Avantage : mécanisme stable et documenté. Inconvénient : relance obligatoire toutes les 30 minutes, ce qui ajoute du bruit et des coûts.

**D. Relancer la conversation fermée (`--resume`)**
Un processus local reprend automatiquement la conversation avec la réponse.

Avantage : rien ne reste en attente. Inconvénients : l'outil devrait exécuter des commandes, ce qui va contre le principe de sécurité « la page ne fait rien elle-même », et c'est risqué si la conversation est encore ouverte.

**E. Aiguilleur (V1)**
Une conversation dédiée reçoit toutes les réponses et les transmet.

Avantage : déjà fait. Inconvénients : c'est le mécanisme le plus lourd et le plus fragile de la V1.

## Proposition de l'IA

Des couches complémentaires plutôt qu'un seul mécanisme :

1. **Socle neutre, toujours actif (option A)** :
   - la réponse est enregistrée, donc jamais perdue ;
   - elle est signalée dans chaque réponse de l'outil à l'agent concerné ;
   - une commande d'attente est disponible ;
   - elle est remise à la reprise du ticket.

   **La prise en compte est un acte explicite de l'agent** (« réponse reçue »), visible par le développeur.
2. **Accélérateur Claude Code : channel (option B)** quand il est activé, avec **Monitor (option C) en secours** si le channel n'est pas disponible.
3. **Cas des conversations fermées** : la réponse attend la prochaine conversation qui prend le ticket ; l'outil le montre (« réponse en attente d'un intervenant »). La relance automatique (option D) est écartée pour l'instant.
4. **L'aiguilleur (option E) est abandonné** au profit de 1 et 2.

## Décision

La proposition de l'IA est retenue telle quelle. Réponses de l'utilisateur :

| Question | Choix |
|---|---|
| Approche | « Oui, en couches » : un socle neutre, plus un accélérateur pour Claude Code |
| Réveiller une conversation Claude Code ouverte | « Channel + Monitor en secours » |
| Conversation fermée | « Elle attend une reprise » |

## Conséquences

- L'interface des agents (MCP et CLI) renvoie systématiquement les réponses en attente de l'intervenant, et offre une commande d'attente.
- L'adaptateur Claude Code contient un serveur channel et une procédure de secours par Monitor.
- Il faudra suivre l'évolution des channels, puisqu'il s'agit d'un aperçu de recherche.
