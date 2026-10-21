# 0025. Maquettes du front : pages HTML publiées, fil de fer puis version fidèle

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (« ajoute une étape 8b pour faire des maquettes du front avec validation » ; choix du format et de la finition)
- Liens : [plan](../plan/v2-plan.md) étape 8b ; [features.md](../product/features.md) ; [ADR 0005](0005-frontend-svelte.md), [0016](0016-stack-serveur-et-validation.md)

## Contexte

Avant d'écrire les interfaces (étape 9) et la page Svelte (étape 10), l'utilisateur veut voir et valider les écrans.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| Format | **Pages HTML publiées** en privé sur claude.ai (recommandé) ; prototype Svelte dans `packages/web` ; fichiers HTML locaux | Pages HTML publiées |
| Finition | Fidèle (recommandé) ; fil de fer | **D'abord un fil de fer, puis une version fidèle** une fois le fil de fer validé |

## Décision

- Les maquettes sont des **pages HTML cliquables, avec des données fictives génériques**, publiées en privé sur claude.ai. L'utilisateur les commente directement ; l'IA corrige et republie à la même adresse.
- **Deux passes** :
  1. **Fil de fer** : organisation et contenu de chaque écran (blocs gris, libellés réels en français) ;
  2. **Version fidèle** : mise en page, couleurs, thèmes clair et sombre. Elle sert de référence à l'étape 10.
- Le code des maquettes est **jetable** : ce n'est pas le code de `packages/web`. Une copie de chaque version validée est gardée dans `docs/mockups/`, avec la liste des choix faits.

## Conséquences

- Les choix d'écran faits pendant la validation qui touchent au produit (une fonctionnalité ajoutée, retirée ou changée) sont reportés dans `features.md`, et dans une ADR s'ils changent une décision.
