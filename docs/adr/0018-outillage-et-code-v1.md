# 0018. Outillage du dépôt et place du code V1

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (réponses aux questions du 2026-10-19, début de l'étape 7)
- Liens : [ADR 0003](0003-build-a-la-release.md) (build), [0014](0014-decoupage-en-paquets.md) (paquets), [0016](0016-stack-serveur-et-validation.md) (stack)

## Contexte

L'étape 7 met en place le socle technique. L'ADR 0016 prévoyait de soumettre l'outillage à l'utilisateur avant de commencer. Il fallait aussi décider de la place du code V1 sur la branche `v2`.

## Options étudiées

| Question | Options |
|---|---|
| Tests | **Vitest** (même moteur que Vite, TypeScript sans étape, couverture) ; `node:test` (sans dépendance, comme la V1, moins outillé) |
| Lint et format | **ESLint + typescript-eslint + Prettier** (règles typées, support Svelte, frontières d'import) ; Biome (rapide, Svelte partiel, pas de règles typées) |
| Artefact | **tsc + esbuild** (un fichier par programme, Node seul) ; tsc seul (il faut livrer un `node_modules`) |
| Code V1 | **Déplacé dans `legacy/`** jusqu'à la bascule ; supprimé de `v2` (consultable sur `master`) |
| Skill V1 utilisable pendant la réécriture | Dossier de travail `master` dédié ; ne pas déplacer la V1 ; laisser casser |

## Décision

Les quatre recommandations de l'IA sont retenues. Sur le skill V1, l'utilisateur a répondu : « Pas besoin de garder utilisable. »

- **Vitest** pour les tests ; Playwright viendra avec la page (ADR 0005).
- **ESLint 10 + typescript-eslint (règles typées strictes) + Prettier.** ESLint garde aussi les frontières de l'ADR 0014. Il remplace `check.mjs`.
- **tsc** vérifie les types ; **esbuild** produira l'artefact livré, **Vite** la page.
- **Le code V1 est déplacé dans `legacy/`**, avec son `CLAUDE.md`, et sera supprimé à l'étape 11.
- Le lien `~/.claude/skills/project-tracker` pointe vers ce dossier : tant que `v2` est extraite, **le skill V1 ne fonctionne plus**. C'est accepté.

Versions installées (choisies parmi celles publiées depuis au moins deux semaines) : TypeScript 6.0.3 (typescript-eslint n'accepte pas encore la 7), Vitest 5.0.3, Vite 8.3.2, ESLint 10.12.0, typescript-eslint 8.71.0, Prettier 3.9.9.

## Conséquences

- La vérification bloquante devient `npm run verify` : types, lint, format, tests.
- `.npmrc` active `legacy-peer-deps` : sans cela, npm 10 plante sur les dépendances optionnelles de Vitest (« reading edgesOut »).
- Le dossier `docs/` n'est plus vérifié par `check.mjs` ; Prettier ignore le Markdown pour ne pas le reformater.
