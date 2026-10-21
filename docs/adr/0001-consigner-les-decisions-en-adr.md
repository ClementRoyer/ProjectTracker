# 0001. Consigner les décisions de la V2 en ADR

- Statut : Acceptée
- Date : 2026-10-16
- Décideur : l'utilisateur (demande du 2026-10-16 : « que tout soit bien structuré afin de pouvoir suivre ces choses-là plus tard et retrouver pourquoi ça a été fait »)
- Liens : [audit outillage](../analysis/2026-10-16-audit-v1/tooling.md) §4

## Contexte

En V1, les décisions vivent dans `references/review-2026-10-12.md`, un journal chronologique en ajout seul où « la décision la plus récente gagne ». Pour connaître la règle en vigueur, il faut tout relire. Les décisions n'ont ni identifiant ni statut, et des propositions de l'IA y figurent sans validation explicite de l'utilisateur.

## Options étudiées

1. **Continuer le journal unique** : simple, mais le problème de lecture empire avec le temps.
2. **ADR numérotées, une décision par fichier**, avec statut et lien « remplacée par » : format standard, chaque décision est trouvable et sa validité est explicite.
3. **Issues ou discussions sur une plateforme** : nécessite un dépôt distant, qui n'existe pas encore, et sépare les décisions du code.

## Décision

Option 2. Les décisions de la V2 sont consignées dans `docs/adr/`. Le journal V1 reste en place comme historique et n'est plus alimenté pour la V2.

## Conséquences

- Toute décision prise avec l'utilisateur donne une ADR. Une proposition reste `Proposée` tant qu'il ne l'a pas validée.
- `docs/README.md` explique comment retrouver une décision.
- Le `CLAUDE.md` de la branche V2 renvoie vers `docs/` pour que les sessions suivent cette règle.
