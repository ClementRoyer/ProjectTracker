# 0037. Changelog de livraison

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (sous-étape 13d)
- Liens : [features.md](../product/features.md) F22, F19 ; [plan de l'étape 13](../plan/etape-13.md)

## Contexte

F22 : un changelog de livraison, activable. Chaque ticket livré en qualité y apporte une ligne.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Rédaction de la ligne | **L'agent propose, le développeur valide** (recommandé) ; le développeur seul ; l'agent seul | L'agent propose, le développeur valide |
| 2. Sortie à la livraison | Texte à copier dans le bilan (recommandé) ; **fichier dans le dépôt** | Fichier dans le dépôt (choix de l'utilisateur contre la recommandation) |
| 3. Activation | **Option de la configuration** (recommandé) ; toujours actif | Option |

## Décision

- **Activation** : `"changelog": true` dans `tracker.config.json` ; `changelogFile` donne le fichier, `CHANGELOG.md` à la racine du projet par défaut. Sans l'option, rien n'apparaît.
- **Une ligne par ticket.** Un agent la propose (opération `proposeChangelog`) ; le développeur la relit, la corrige et l'accepte dans le dossier du ticket. Seule une ligne acceptée part dans le changelog. Proposition et acceptation sont notées au journal.
- **À la livraison en qualité** (F19), le serveur ajoute au fichier une section pour la livraison : son nom et sa date, puis une ligne `- <clé> : <ligne>` par ticket qui a une ligne acceptée. La section la plus récente vient en tête, sous le titre du fichier ; un fichier absent est créé avec le titre « Changelog ». Les tickets sans ligne acceptée sont nommés dans le compte rendu de la livraison.
- Format proposé par l'IA.

## Conséquences

- C'est le seul endroit où l'outil écrit dans le dépôt du projet ; il n'écrit que ce fichier, et seulement à une livraison.
- La migration 5 de la base ajoute la table des lignes de changelog.
