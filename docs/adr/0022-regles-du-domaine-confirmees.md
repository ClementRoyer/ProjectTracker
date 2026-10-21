# 0022. Règles du domaine confirmées

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (réponses aux cinq questions du 2026-10-19)
- Liens : `packages/core/src/domain/` ; complète l'[ADR 0012](0012-mesure-de-l-usage-ia.md) (usage) et l'[ADR 0015](0015-modele-de-donnees.md) (modèle)

## Contexte

À l'étape 7, l'IA a écrit `core/domain` en tranchant seule cinq règles que les documents produit ne fixaient pas. Elles devaient être confirmées par l'utilisateur.

## Options étudiées

| Règle | Interprétation de l'IA (codée) | Autres options présentées |
|---|---|---|
| 1. Attente affichée | Le développeur d'abord, sinon l'attente la plus ancienne | La plus ancienne ; toutes les attentes affichées |
| 2. « Sans nouvelles » | Seulement un ticket « en cours » et non clos | Tout ticket ouvert |
| 3. Changement de phase | Retour permis ; changer de phase remet l'avancement à « pas démarré » | En avant seulement ; retour avec avancement gardé |
| 4. Clôture | Par le développeur, seulement après une validation qualité « faite » | À tout moment par le développeur ; anticipée avec motif |
| 5. Périodes d'usage | UTC, semaines ISO | Heure locale, semaine du lundi (recommandée) |

## Décision

- **Règles 1 à 4 : confirmées** telles qu'elles sont codées.
- **Règle 5 : heure locale.** Les jours, semaines et mois d'usage suivent le **fuseau du développeur** (minuit chez lui), et la semaine va du lundi au dimanche (numérotation ISO).

## Conséquences

- `periodKey` et `summarizeUsage` reçoivent le fuseau (nom IANA, par exemple `Europe/Paris`) : le domaine reste pur, sans lire l'environnement.
- Le fuseau vient de la configuration de l'outil. Si elle ne le donne pas, c'est le fuseau de la machine.
- Les instants restent enregistrés en UTC ; seul le regroupement par période dépend du fuseau.
