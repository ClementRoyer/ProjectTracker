# 0040. Dépôts, groupes de tickets, documents de référence

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (sous-étape 13g)
- Liens : [features.md](../product/features.md) F31, F23 ; [ADR 0014](0014-decoupage-en-paquets.md) (la CLI lit git, le serveur jamais) ; [plan de l'étape 13](../plan/etape-13.md)

## Contexte

F31 réunit trois besoins de la V1 : les fichiers modifiés par dépôt, les regroupements de tickets et les documents de référence du projet. L'utilisateur a un projet à plusieurs dépôts.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Plusieurs dépôts | Oui ; non, un seul | **Oui, plusieurs** |
| 2. Groupes de tickets | **Étiquette et filtre** (recommandé) ; un niveau de plus dans la liste ; pas de groupes | Étiquette et filtre |
| 3. Documents de référence | **Liste lisible par tous** (recommandé) ; documents par ticket ; pas de documents | Liste lisible par tous |

## Décision

1. **Dépôts.** La configuration nomme les dépôts du projet : `repos`, une liste de `{ "name": "front", "path": "front" }`, chemins relatifs à la racine du projet. La CLI rapporte les fichiers modifiés de chaque dépôt (elle lit git ; le serveur jamais), chemins relatifs à la racine ; le dossier du ticket les range par dépôt. Sans `repos`, rien ne change.
2. **Groupes.** Le développeur range un ticket dans un groupe nommé (créé à la première utilisation) ou l'en sort. La ligne et la carte montrent le groupe ; la liste et le tableau se filtrent par groupe.
3. **Documents.** La configuration donne des motifs de fichiers (`documents`, par exemple `["README.md", "docs/**/*.md"]`), relatifs à la racine du projet. La page les liste et les affiche en texte ; les agents en reçoivent la liste au début de leur session, et peuvent en lire un par l'outil MCP ou la CLI. Seuls les fichiers que donnent les motifs sont lisibles par l'outil.

## Conséquences

- Opérations nouvelles : ranger un ticket dans un groupe ; lister et lire les documents.
- Le serveur lit les documents du projet (lecture seule), comme il écrit déjà le changelog (ADR 0037).
