# 0035. Pièces jointes d'un ticket

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (sous-étape 13b)
- Liens : [features.md](../product/features.md) F30 ; [ADR 0013](0013-base-par-projet-et-sauvegarde.md), [0024](0024-migration-des-donnees-v1.md), [0027](0027-authentification-du-developpeur.md), [0030](0030-installation-dans-un-projet.md) ; [plan de l'étape 13](../plan/etape-13.md)

## Contexte

F30 : joindre une capture ou un fichier à un ticket, le voir dans la discussion, et que les agents puissent le lire. La table `attachment` existe (ADR 0015) et la migration V1 y range déjà les pièces jointes, à côté de la base.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Stockage | **À côté de la base**, `tools/tracker/attachments/<ticket>/` (recommandé) ; dans la base | À côté de la base |
| 2. Fichiers acceptés | **Tout fichier, 20 Mo au plus** (recommandé) ; images seulement, 10 Mo | Tout fichier, 20 Mo |
| 3. Ajout depuis la page | **Bouton, collage d'une image, glisser-déposer** (recommandé) ; bouton seulement | Les trois |
| 4. Lecture par les agents | **Chemin sur le disque et adresse HTTP** (recommandé) ; chemin seulement | Chemin et adresse |

## Décision

- Les fichiers vont dans `tools/tracker/attachments/<ticket>/`, ignoré par git. **La sauvegarde et la mise à jour copient ce dossier avec la base.**
- **Tout fichier jusqu'à 20 Mo.** Les images courantes (PNG, JPEG, GIF, WebP) s'affichent dans la discussion ; les autres fichiers, SVG compris, sont des liens à télécharger, jamais affichés dans la page (un SVG peut porter du script).
- **Depuis la page** : le bouton « Joindre une capture », le collage d'une image dans la zone de message et le glisser-déposer. Les pièces partent avec le message ; le message reçu par l'intervenant les nomme, avec leur chemin et leur adresse.
- **Pour les agents** : la fiche du ticket donne pour chaque pièce son chemin sur le disque et son adresse HTTP, lisible avec un jeton. Les agents joignent un fichier par la CLI (`tracker attach <ticket> <fichier>`).
- L'envoi passe par une route HTTP à part, `POST /api/attachments` (contenu brut), avec les mêmes contrôles que le reste de l'API (jeton, `Host`) ; la lecture par `GET /api/attachments/<id>`.

## Conséquences

- Une pièce jointe est rattachée à l'entrée du journal qui l'a portée (message, entrée d'un agent).
- La sauvegarde manuelle et celle d'avant une mise à jour deviennent un dossier : la base et les pièces jointes.
