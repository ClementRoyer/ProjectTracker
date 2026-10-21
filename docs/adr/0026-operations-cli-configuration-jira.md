# 0026. Catalogue d'opérations, CLI, configuration et client Jira

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (quatre recommandations retenues au lancement de l'étape 9)
- Liens : [plan de l'étape 9](../plan/etape-9.md) ; [ADR 0011](0011-interface-des-agents.md), [0014](0014-decoupage-en-paquets.md), [0016](0016-stack-serveur-et-validation.md) ; [features.md](../product/features.md) F2

## Contexte

L'étape 9 écrit les portes d'entrée de l'outil. L'ADR 0011 veut que le MCP et la CLI offrent les mêmes opérations, avec la même logique côté serveur. Il faut aussi choisir comment lire la configuration et parler à Jira, en lecture seule.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Décrire les opérations | **Catalogue unique** dans `contract` (recommandé) ; API REST par ressource, MCP et CLI écrits à part | Catalogue unique |
| 2. Arguments de la CLI | **`node:util` `parseArgs`** (recommandé) ; commander ; citty | `parseArgs` |
| 3. Fichier de configuration | **JSON validé par Zod** (recommandé) ; JSONC ; YAML | JSON + Zod |
| 4. Client Jira | **`fetch` natif + Zod** (recommandé) ; bibliothèque jira.js | `fetch` + Zod |

## Décision

1. **Catalogue unique d'opérations.** Chaque opération est déclarée une fois dans `contract` : un nom, une description, un schéma Zod d'entrée et un de sortie, et qui peut l'appeler (développeur, agent, lanceur). Le serveur en tire :
   - une route HTTP `POST /api/<opération>` ;
   - un outil MCP du même nom, dont le JSON Schema est dérivé du schéma Zod ;
   - une commande CLI, avec son aide générée.

   La logique vit dans le cas d'usage de `core/usecases` ; les trois portes n'en contiennent pas. Les lectures de la page (vue d'ensemble, fiche) sont aussi des opérations du catalogue.
2. **CLI avec `parseArgs`** de `node:util`, sans dépendance.
3. **Configuration en JSON**, validée par Zod au démarrage du serveur ; une erreur dit quelle clé est fausse. Les secrets (jeton Jira) n'y sont jamais : le fichier nomme seulement la variable d'environnement qui les porte.
4. **Jira par `fetch` natif**, réponses validées par Zod. Le client n'a que des requêtes de lecture : aucune fonction d'écriture n'existe dans le code.

## Conséquences

- Ajouter une opération = une entrée du catalogue + son cas d'usage + ses tests ; la page, le MCP et la CLI la voient sans autre code.
- Aucune dépendance nouvelle pour la CLI, la configuration et Jira.
- Le flux d'événements de la page (SSE, ADR 0016) n'est pas une opération : c'est une route à part du serveur.
