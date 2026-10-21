# 0028. Page Svelte : structure, styles, navigation, tests, agent actif

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (questions posées au lancement de l'étape 10)
- Liens : [plan de l'étape 10](../plan/etape-10.md) ; [ADR 0005](0005-frontend-svelte.md), [0016](0016-stack-serveur-et-validation.md), [0025](0025-maquettes-du-front.md), [0027](0027-authentification-du-developpeur.md) ; [maquette validée](../mockups/README.md)

## Contexte

L'étape 10 écrit la page d'après la maquette fidèle validée. Svelte 5, Vite et TypeScript sont déjà retenus (ADR 0005, 0016). Il reste à choisir comment structurer, styler, naviguer et tester la page, et à fixer la règle de l'icône « un agent travaille », laissée ouverte à la maquette.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Structure | **Svelte 5 + Vite seul**, une page servie par le serveur Hono (recommandé) ; SvelteKit en sortie statique | Svelte + Vite seul |
| 2. Styles | **CSS maison avec les variables de la maquette** (recommandé) ; Tailwind | CSS maison |
| 3. Navigation | **Routage par `#` écrit à la main** (recommandé) ; bibliothèque (svelte-spa-router) | Routage maison |
| 4. Tests | **Playwright pour les parcours + Vitest pour la logique pure** (recommandé) ; en plus, Testing Library par composant | Playwright + Vitest |
| 5. Vérifier les `.svelte` | **svelte-check, eslint-plugin-svelte, prettier-plugin-svelte** (recommandé) ; svelte-check seul | Les trois |
| 6. Polices | **Embarquées (@fontsource, licence OFL)** (recommandé) ; polices du système ; Google Fonts | Embarquées |
| 7. « Un agent travaille » | Activité récente (recommandé) ; conversation ouverte ; back-end seulement | Voir la décision : réponse de l'utilisateur |

## Décision

1. **Svelte 5 + Vite**, sans SvelteKit. Le paquet `web` construit des fichiers statiques. Le serveur Hono les sert sur son adresse et injecte le jeton du développeur dans le HTML (ADR 0027).
2. **CSS maison** : les variables de couleur des thèmes clair et sombre reprises de la maquette, et des styles propres à chaque composant.
3. **Routage par `#`** (`#/ticket/LOC-1`), écrit à la main.
4. **Tests** : Playwright pour les parcours, contre un vrai serveur et une base temporaire ; c'est le critère de fin de l'étape. Vitest pour la logique pure de la page (regroupement par qui doit agir, tri, fil de discussion). Pas de tests de composants.
5. **svelte-check, eslint-plugin-svelte et prettier-plugin-svelte**, ajoutés à `npm run verify`. Les seuils de l'ADR 0019 valent aussi pour les composants.
6. **IBM Plex Sans et Mono embarquées** : aucune requête vers Internet, la page marche sur le réseau privé et hors ligne.
7. **« Un agent travaille »**, réponse de l'utilisateur : « L'agent qui travaille doit dire quand il commence puis quand il a fini, ou l'API peut essayer de le faire avec une logique. » Comme pour l'usage (ADR 0012), en couches :
   - **signalé** : une opération `reportWorking` (début, fin) ouverte aux agents ; l'adaptateur Claude Code la fait seul, au début d'un tour (hook `UserPromptSubmit`) et à la fin (hook `Stop`) ; une exécution du lanceur compte de son début à sa fin ;
   - **déduit**, quand rien n'est signalé : une écriture d'un agent sur le ticket vaut un début ; une question au développeur, la réponse de fin de tour, ou 15 minutes sans activité valent une fin. Les 15 minutes sont réglables dans la configuration.

## Conséquences

- Dépendances ajoutées, figées : `svelte`, `@sveltejs/vite-plugin-svelte`, `@playwright/test`, `svelte-check`, `eslint-plugin-svelte`, `prettier-plugin-svelte`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`.
- Playwright télécharge un navigateur (Chromium) à l'installation des outils de développement ; l'artefact livré n'en contient pas.
- `npm run build` construit aussi la page ; `dist/` la contient à côté de `server.js`.
- La page ne parle au serveur que par le catalogue d'opérations et le flux d'événements, comme la CLI (ADR 0014, 0026).
- Un agent sans adaptateur qui ne signale rien reste couvert par la règle déduite ; l'icône peut alors s'éteindre avec retard (au plus 15 minutes).
