# 0006. Code en anglais, interface et documents en français

- Statut : Acceptée
- Date : 2026-10-18
- Décideur : l'utilisateur (réponse « oui » à la question 1 du [glossaire](../product/glossary.md))
- Liens : [audit outillage](../analysis/2026-10-16-audit-v1/tooling.md) §4, [glossaire](../product/glossary.md)

## Contexte

En V1, les langues sont mélangées : contrats en anglais, architecture et décisions en français, et des termes de domaine tantôt en anglais, tantôt en français. Le glossaire V2 fixe un mot par notion, ce qui oblige à choisir une langue par usage.

## Options étudiées

1. **Tout en anglais** : c'est l'usage courant pour le code, mais le développeur travaille en français.
2. **Tout en français**, y compris le code : identifiants accentués ou approximatifs, et un écart avec l'écosystème.
3. **Code en anglais ; interface et documents en français** : chaque terme du glossaire a un nom français et un nom de code anglais.

## Décision

**Option 3.** Le code (identifiants, schémas, messages de commit) est en anglais. Les documents du projet et l'interface sont en français. L'anglais reste disponible comme seconde langue de l'interface (F27).

## Conséquences

- Le glossaire est la table de correspondance entre le terme français et le nom dans le code.
- Les textes d'interface passent par les fichiers de traduction, avec le français comme langue par défaut.
- Les contrats techniques de la V2 (données, interfaces) sont rédigés en français, avec les noms de code en anglais.
