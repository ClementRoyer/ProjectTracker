# 0005. Page web en Svelte + Vite + TypeScript

- Statut : Acceptée
- Date : 2026-10-16
- Décideur : l'utilisateur (réponse à la question « Quelle technologie pour la page web ? »)
- Liens : [audit frontend](../analysis/2026-10-16-audit-v1/frontend.md) §3 et §4, [0003](0003-build-a-la-release.md)

## Contexte

La page V1 repose sur un mini-framework maison (`web/dom.js`) et un store global façon Redux, également maison (`web/app.js`). Tout l'état éphémère de l'interface y remonte. Une partie de la logique est dupliquée avec le serveur. La page n'est jamais testée dans un vrai navigateur.

## Options étudiées

1. **Preact + Vite + TS** : très léger, proche du modèle actuel `h()` / vnodes, migration vue par vue.
2. **Svelte + Vite + TS** : léger, CSS limité à chaque composant, syntaxe concise. Toutes les vues sont à réécrire.
3. **React + Vite + TS** : le plus gros écosystème (TanStack Query, Radix), mais plus lourd.

## Décision

**Option 2 : Svelte + Vite + TypeScript**, compilé à la release (ADR 0003).

## Conséquences

- Les vues sont réécrites en composants Svelte. L'état éphémère de l'interface devient local aux composants.
- On reprend presque tels quels, une fois typés : le client API (`api.js`), la synchronisation (`sync.js` : ETag, invalidation par SSE), les sélecteurs purs et les tokens CSS.
- Les modèles de vue sont partagés et typés avec le serveur, ce qui supprime les doublons (`standingText`, `nameOf`…).
- La sécurité est préservée : un seul composant Markdown nettoyé par DOMPurify, aucun `{@html}` ailleurs, une CSP sans inline, le jeton CSRF sur les écritures.
- Des tests E2E Playwright avec axe-core sur des fixtures génériques remplacent une partie des tests structurels de vues.
