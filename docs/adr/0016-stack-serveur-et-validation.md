# 0016. Stack : Svelte confirmé, Hono pour le serveur, Zod pour la validation

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (réponses du 2026-10-19, après sa remarque « Tu ne m'as pas posé la question de sur quelle stack partir, quel framework front, etc. »)
- Liens : [ADR 0003](0003-build-a-la-release.md) (build), [0005](0005-frontend-svelte.md) (Svelte), [0011](0011-interface-des-agents.md) (serveur unique), [0014](0014-decoupage-en-paquets.md) (paquets)

## Contexte

L'ADR 0005 (Svelte) date du 2026-10-16, avant le travail sur les besoins. Le framework du serveur et la bibliothèque de validation n'avaient jamais été demandés à l'utilisateur. L'IA comptait les choisir seule à l'étape 7 ; l'utilisateur l'a relevé, et les trois questions lui ont été posées.

## Options étudiées

| Question | Options |
|---|---|
| Page web | **Garder Svelte 5 + Vite + TS** (page surtout de lecture, léger) ; React + Vite (plus gros écosystème, plus lourd) ; Vue 3 + Vite (intermédiaire) |
| Serveur HTTP | **Hono** (petit, typé, SSE et middlewares, facile à embarquer) ; Fastify (très mûr, plus « cadre ») ; `node:http` seul (tout à réécrire, comme la V1) |
| Validation | **Zod** (standard de fait, utilisé par le SDK MCP officiel) ; Valibot (plus léger, moins répandu) ; TypeBox (JSON Schema natif, moins agréable) |

## Décision

Les trois recommandations de l'IA sont retenues :
- **Page web : Svelte 5 + Vite + TypeScript.** L'ADR 0005 est confirmée.
- **Serveur : Hono** sur Node, pour l'API HTTP, le flux d'événements (SSE) et le MCP en HTTP (SDK MCP officiel).
- **Validation : Zod**, dans le paquet `contract`. Un même schéma sert au serveur, à la CLI, à la page, aux outils MCP et à la réponse structurée des agents ([ADR 0017](0017-reponse-structuree-des-agents.md)). Les JSON Schema nécessaires aux outils d'agent en sont dérivés.

## Conséquences

- Les choix d'outillage restants (lanceur de tests, lint, format) seront proposés à l'utilisateur au début de l'étape 7, et non choisis seuls.
- Hono et Zod sont embarqués dans l'artefact livré (ADR 0003) : l'installation reste « Node seul ».
