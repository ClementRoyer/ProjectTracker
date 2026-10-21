# 0028. Svelte page: structure, styles, navigation, tests, active agent

- Status: Accepted
- Date: 2026-10-20
- Decider: the user (questions asked at the start of step 10)
- Links: [plan of step 10](../plan/etape-10.md); [ADR 0005](0005-frontend-svelte.md), [0016](0016-stack-serveur-et-validation.md), [0025](0025-maquettes-du-front.md), [0027](0027-authentification-du-developpeur.md); [validated mockup](../mockups/README.md)

## Context

Step 10 writes the page from the validated faithful mockup. Svelte 5, Vite and TypeScript are already chosen (ADR 0005, 0016). It remains to choose how to structure, style, navigate and test the page, and to set the rule for the "An agent is working" icon, which was left open in the mockup.

## Options considered

| Question | Options | Choice |
|---|---|---|
| 1. Structure | **Svelte 5 + Vite alone**, one page served by the Hono server (recommended); SvelteKit with static output | Svelte + Vite alone |
| 2. Styles | **Home-made CSS with the mockup's variables** (recommended); Tailwind | Home-made CSS |
| 3. Navigation | **Routing by `#` written by hand** (recommended); library (svelte-spa-router) | Home-made routing |
| 4. Tests | **Playwright for the journeys + Vitest for the pure logic** (recommended); in addition, Testing Library per component | Playwright + Vitest |
| 5. Checking the `.svelte` files | **svelte-check, eslint-plugin-svelte, prettier-plugin-svelte** (recommended); svelte-check alone | All three |
| 6. Fonts | **Embedded (@fontsource, OFL licence)** (recommended); system fonts; Google Fonts | Embedded |
| 7. "An agent is working" | Recent activity (recommended); open conversation; back-end only | See the decision: the user's answer |

## Decision

1. **Svelte 5 + Vite**, without SvelteKit. The `web` package builds static files. The Hono server serves them on its address and injects the developer's token into the HTML (ADR 0027).
2. **Home-made CSS**: the colour variables of the light and dark themes taken from the mockup, and styles specific to each component.
3. **Routing by `#`** (`#/ticket/LOC-1`), written by hand.
4. **Tests**: Playwright for the journeys, against a real server and a temporary database; this is the exit criterion of the step. Vitest for the pure logic of the page (grouping by who must act, sorting, discussion thread). No component tests.
5. **svelte-check, eslint-plugin-svelte and prettier-plugin-svelte**, added to `npm run verify`. The thresholds of ADR 0019 also apply to the components.
6. **IBM Plex Sans and Mono embedded**: no request to the Internet, the page works on the private network and offline.
7. **"An agent is working"**, the user's answer: "The agent that works must say when it starts and when it has finished, or the API can try to do it with logic." As for usage (ADR 0012), in layers:
   - **reported**: an operation `reportWorking` (start, end) open to agents; the Claude Code adapter does it by itself, at the start of a turn (`UserPromptSubmit` hook) and at the end (`Stop` hook); an execution of the launcher counts from its start to its end;
   - **inferred**, when nothing is reported: a write by an agent on the ticket counts as a start; a question to the developer, the end-of-turn answer, or 15 minutes without activity count as an end. The 15 minutes can be set in the configuration.

## Consequences

- Dependencies added, pinned: `svelte`, `@sveltejs/vite-plugin-svelte`, `@playwright/test`, `svelte-check`, `eslint-plugin-svelte`, `prettier-plugin-svelte`, `@fontsource/ibm-plex-sans`, `@fontsource/ibm-plex-mono`.
- Playwright downloads a browser (Chromium) when the development tools are installed; the shipped artefact does not contain it.
- `npm run build` also builds the page; `dist/` contains it next to `server.js`.
- The page talks to the server only through the operations catalogue and the event stream, as the CLI does (ADR 0014, 0026).
- An agent without an adapter that reports nothing stays covered by the inferred rule; the icon may then switch off late (at most 15 minutes).
