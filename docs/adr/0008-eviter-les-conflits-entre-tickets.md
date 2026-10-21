# 0008. Éviter les conflits entre tickets traités en parallèle

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (réponses aux questions du 2026-10-19)
- Liens : [features.md](../product/features.md) F16 (B4.4, primaire), F34 (secondaire) ; [needs.md](../product/needs.md) M4 ; [glossaire](../product/glossary.md) (fichier tenu, ressource partagée, verrou, conflit, garde)

## Contexte

Mots de l'utilisateur (M4) : les conflits arrivent « très très souvent ». Aujourd'hui, il les évite en ne modifiant pas le code de plusieurs tickets en même temps. Le nouvel outil doit rendre ce parallélisme possible.

Le problème a deux volets.
1. **Le code** : deux intervenants modifient les mêmes fichiers. Dans un même dossier, ils partagent aussi l'état de git : modifications non commitées, branche courante, build cassé par l'un et subi par l'autre.
2. **Les ressources partagées** : un environnement qu'un seul ticket peut utiliser à la fois, par exemple les tests e2e.

La V1 traite le code par des **fichiers tenus** (déclarés avant modification, avec une garde par hook qui refuse l'écriture), et les ressources par un **verrou** (`lock run … -- <commande>`). Les deux s'appliquent dans **un seul dossier de travail partagé**. La garde repose sur des expressions régulières sur les commandes shell (faux positifs connus) et sur un hook propre à Claude Code. La détection de vie se fait par numéro de processus.

## Volet 1 : le code

### Options

**A. Un dossier de travail par ticket (git worktree)**

Chaque ticket a sa branche et son propre dossier. Les intervenants ne se voient pas : ni fichiers, ni état git, ni build partagés. Les conflits n'apparaissent qu'au moment de réunir les branches, sous forme de conflits git classiques.

- Avantages :
  - isolation totale, quel que soit l'outil d'agent ;
  - la pratique courante pour faire travailler plusieurs agents en parallèle ;
  - Claude Code sait déjà travailler dans un worktree (outil dédié, isolation des sous-agents).
- Inconvénients :
  - chaque dossier doit être installé (dépendances, fichiers d'environnement) ;
  - les serveurs de développement ont besoin de ports différents ;
  - il faut réunir les branches avant la livraison ;
  - un conflit est découvert tard s'il n'est pas détecté avant.

**B. Un seul dossier et des fichiers tenus (V1)**

- Avantages : pas de duplication, et l'exclusivité est garantie en temps réel.
- Inconvénients :
  - dépend de la discipline des agents et d'une garde propre à Claude Code ;
  - l'état git et le build restent partagés ;
  - deux tickets qui touchent le même fichier ne peuvent pas avancer ensemble.

**C. Un dossier par ticket, avec détection précoce des chevauchements** (A enrichi)

En plus de A, l'outil compare régulièrement les fichiers modifiés par chaque ticket, en lisant git dans chaque dossier. Il signale tout de suite que deux tickets touchent le même fichier. Le développeur voit alors un risque de conflit, et non plus un blocage. Les fichiers tenus restent possibles, comme verrou volontaire sur un fichier sensible (F34).

### Proposition de l'IA

**Option C.**

## Volet 2 : les ressources partagées

### Options

**R1. Verrou géré par l'outil, avec file d'attente**

- L'intervenant demande la ressource, l'utilise, puis la rend. Une commande enveloppe tient le verrou pendant toute l'exécution : `tracker resource run e2e -- <commande>`.
- Le verrou est stocké dans la base (ADR 0004), avec une durée de validité renouvelée par des signes de vie, au lieu du numéro de processus.
- Qui l'attend apparaît dans la situation du ticket : **attente : ressource « e2e »**.
- Avantage : neutre vis-à-vis de l'outil d'agent.

**R2. R1 plus une garde Claude Code**

Un hook refuse une commande e2e lancée hors de la commande enveloppe. Cela rattrape un agent indiscipliné, mais reprend la garde par expressions régulières de la V1, fragile et propre à Claude Code.

**R3. Rien de spécial** : on reste dans la situation actuelle.

### Proposition de l'IA

**R1**, avec la garde de R2 en **option** (F34, secondaire), désactivée par défaut.

## Ressources propres à chaque dossier (à explorer)

Avec un dossier par ticket, certaines ressources doivent être **distinctes par ticket** plutôt qu'exclusives : le port du serveur de développement, une base locale. L'outil pourrait attribuer un port à chaque ticket. C'est à confirmer selon le projet.

## Décision

| Question | Réponse de l'utilisateur |
|---|---|
| Organisation git d'un ticket aujourd'hui | « Variable » (une branche par ticket ou une branche commune, selon le cas) |
| Approche pour le code | « Worktree + détection » (option C) |
| Approche pour les ressources partagées | « Verrou + file d'attente » (R1, garde Claude Code en option désactivée par défaut) |
| Installer un nouveau dossier de travail sur le projet | « Je ne sais pas » |

Ajustements qui découlent de ces réponses :
- **Le dossier par ticket est le mode recommandé, pas une obligation.** Comme l'organisation git varie, un ticket peut aussi être traité dans le dossier principal. Dans ce cas, la détection des chevauchements s'applique entre les tickets qui partagent ce dossier, et les fichiers tenus (F34) restent disponibles.
- **La préparation d'un dossier de travail est configurable par projet** : une commande de préparation (installer les dépendances, copier les fichiers d'environnement, choisir un port), lancée par l'intervenant, jamais par la page.
- **Risque à lever avant de construire** : le coût réel de la préparation d'un dossier sur le projet de l'utilisateur est inconnu. Un essai sera fait au début de l'étape « interfaces agents » du plan.

## Conséquences

- Le ticket connaît sa **branche** et son **dossier de travail**, s'il en a un. La reprise (F15) se fait dans ce dossier.
- L'outil lit git dans chaque dossier pour la détection des chevauchements. Cela sert aussi F23 (changements de code du ticket).
- La livraison en qualité (F19) comprend la réunion des branches des tickets du lot.
- Le glossaire gagne deux termes : **dossier de travail** (`worktree`) et **chevauchement** (`overlap`), un risque de conflit détecté.
