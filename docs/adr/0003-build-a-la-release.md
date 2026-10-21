# 0003. Dépendances et build dans le dépôt, artefact autonome livré

- Statut : Acceptée
- Date : 2026-10-16
- Décideur : l'utilisateur (réponse à la question « Que fait-on de la contrainte "zéro dépendance, copié tel quel" ? »)
- Liens : [audit outillage](../analysis/2026-10-16-audit-v1/tooling.md) §3, [audit backend](../analysis/2026-10-16-audit-v1/backend.md) §5

## Contexte

La V1 impose « aucune dépendance, copié tel quel » à la fois au produit installé **et** au dépôt de développement. Cela a obligé à réimplémenter le typage (absent), la validation (`schema.mjs`), une base transactionnelle (`transaction.mjs`), un framework de rendu (`dom.js`) et un analyseur JavaScript (`check.mjs`).

## Options étudiées

1. **Build à la release** : TypeScript et dépendances dans le dépôt. On livre un artefact compilé et autonome, toujours sans `npm install` chez l'utilisateur.
2. **Paquet npm** installé globalement (`npx project-tracker`) : plus de copie dans chaque projet, mais une dépendance au registre npm.
3. **Garder le zéro-dépendance** : JSDoc + `tsc --checkJs`, bibliothèques vendorisées. Les gains sont limités.

## Décision

**Option 1 : build à la release.**

## Conséquences

- Le dépôt devient un projet TypeScript avec des dépendances de développement et d'exécution, une compilation, un lint standard et des outils d'analyse.
- La contrainte « zéro dépendance » ne porte plus que sur **l'artefact livré** : un dossier compilé et embarqué, qui tourne avec Node seul.
- Une étape de release produit cet artefact, versionné et tagué. L'installation et la mise à jour copient l'artefact, plus jamais le dossier de travail.
- `check.mjs` est réduit aux règles métier ; le reste passe à des outils standard.
- La version minimale de Node est relevée à **22.13** (voir [0004](0004-stockage-sqlite.md)).
