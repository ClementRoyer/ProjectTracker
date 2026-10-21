# 0009. Aperçu et commits des dossiers de travail

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (réponses du 2026-10-19)
- Liens : complète l'[ADR 0008](0008-eviter-les-conflits-entre-tickets.md) ; [features.md](../product/features.md) F24 (test visuel), F19 (livraison) ; [needs.md](../product/needs.md) M8

## Contexte

L'utilisateur a relevé deux difficultés des dossiers de travail (2026-10-19) :

> « Le problème des subtrees, c'est difficile de lancer le serveur sur chaque subtree pour voir où en sont les développements ou valider visuellement des informations. »

> « Les subtrees nécessitent de commit et push, sauf que si c'est fait par Claude, il ajoute le co-auth, ce qui est faux car il n'est potentiellement pas intervenu. »

## Difficulté 1 : voir un ticket en marche

### Options

**V1. Un serveur par dossier de travail**, chacun sur un port attribué par l'outil. On voit tous les tickets en même temps. Mais cela fait N serveurs à faire tourner (mémoire, temps de démarrage) et N installations.

**V2. Un seul aperçu, que l'on bascule d'un ticket à l'autre.** Un seul serveur de développement, sur un port fixe. Le développeur choisit quel ticket est « en aperçu », et l'aperçu montre le code de ce ticket. C'est conforme à son usage : il valide visuellement un ticket à la fois. Deux façons de le réaliser, à choisir après l'essai prévu par l'ADR 0008 :
- arrêter le serveur et le relancer dans le dossier du ticket (il faut que chaque dossier soit installé) ;
- garder le serveur dans le dossier principal et y amener le code du ticket (git : passage sur le dernier commit du ticket).

**V3. Une branche d'intégration.** Toutes les branches en cours sont réunies en continu dans une branche d'aperçu. On voit tout ensemble, et les conflits apparaissent tôt. Mais c'est le plus complexe, et le résultat ne montre jamais un ticket isolé.

**V4. Rester dans le dossier principal pour les tickets très visuels.** L'ADR 0008 le permet déjà. On perd l'isolation pour ces tickets.

### Proposition de l'IA

**V2, un aperçu unique et basculable**, complété par V4 au cas par cas.

- Basculer l'aperçu est une **action de l'intervenant ou du développeur** (commande), jamais de la page, qui n'exécute rien. La page affiche quel ticket est en aperçu.
- **L'aperçu est une ressource partagée** au sens de l'ADR 0008 : un seul ticket à la fois, et les autres attendent.

## Difficulté 2 : commits et co-auteur

### Constats

- **Pas besoin de pousser.** Les dossiers de travail d'un même dépôt partagent le même historique git. Une branche commitée dans un dossier est visible tout de suite depuis le dossier principal. Le `push` n'est nécessaire que pour publier vers le dépôt distant, comme aujourd'hui.
- **Commiter reste nécessaire** pour réunir les branches, ou pour amener le code dans l'aperçu (V2, seconde façon).
- **La mention de co-auteur** est ajoutée par Claude Code selon son réglage d'attribution. Elle se désactive dans les réglages du projet. Le nom exact du réglage sera vérifié à l'implémentation.

### Proposition de l'IA

1. **L'installation de l'outil désactive l'attribution automatique** dans les réglages Claude Code du projet, comme le demandent déjà les consignes globales de l'utilisateur.
2. **Une commande de commit fournie par l'outil**, utilisable par tout agent. Elle applique la convention du projet (gitmoji, une phrase simple en anglais), sans aucune mention de co-auteur, et l'auteur est le développeur (configuration git). Cela ne dépend plus de l'outil d'agent.
3. **Les commits intermédiaires d'un ticket peuvent être regroupés** au moment de la réunion des branches, au choix du développeur. Ce qui entre dans la branche principale est alors un commit propre par ticket.

## Décision

| Question | Choix de l'utilisateur |
|---|---|
| Voir un ticket en marche | **V3, une branche d'intégration** (et non la proposition V2 de l'IA) |
| Commits | « Oui » : attribution désactivée, plus la commande de commit de l'outil, plus le regroupement possible des commits d'un ticket |

**Fonctionnement retenu pour l'aperçu** :
- une **branche d'intégration** (`preview`) est reconstruite à partir de la branche principale, en y réunissant les branches des tickets en cours ;
- **un seul serveur de développement** tourne sur cette branche, dans un dossier dédié, sur un port fixe ;
- la reconstruction est une commande, lancée par un intervenant ou par le développeur, jamais par la page. La page affiche quels tickets sont dans l'aperçu et quand il a été reconstruit ;
- **un conflit de réunion est signalé sur les tickets concernés**. Il complète la détection des chevauchements (ADR 0008) par un vrai test de réunion, plus tôt que la livraison.

## Conséquences

- Nouvelles notions : **branche d'intégration** et **aperçu** (le serveur qui tourne dessus).
- Nouvelles commandes : reconstruire l'aperçu ; commiter selon la convention.
- Les tickets doivent commiter pour entrer dans l'aperçu : la commande de commit de l'outil rend cela simple.
- L'installeur modifie le réglage d'attribution du projet.
