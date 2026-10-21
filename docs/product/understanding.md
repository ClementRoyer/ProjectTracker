# Compréhension du produit

- Statut : **Validé** (2026-10-19)
- Version : 2 (2026-10-18), corrigée après la remarque de l'utilisateur
- Sources : `README.md`, `SKILL.md`, `references/review-2026-10-12.md`, [audit V1](../analysis/2026-10-16-audit-v1/README.md)

Ce document reformule pourquoi project-tracker existe et ce qu'il doit faire. Il sert de cadre aux besoins ([needs.md](needs.md)). Une fois validé, il devient la référence du « quoi ».

## Correction de l'utilisateur (2026-10-18)

La version 1 de ce document plaçait les **agents d'IA** au centre. L'utilisateur l'a corrigée :

> « Le but initial du projet n'est pas [celui-là]. La genèse, c'est de gérer plusieurs tickets sur un projet, pouvoir traiter plusieurs tickets en même temps, et la difficulté est de suivre où en est chaque ticket, revoir les infos du ticket. »

Le centre du produit est donc **le ticket**. Les agents sont un moyen de traiter les tickets, pas le sujet.

## 1. Le problème

Sur un projet, le développeur a **plusieurs tickets à traiter, et il les traite en même temps**. Ce parallélisme est rendu possible par les agents d'IA. La difficulté :

- **Savoir où en est chaque ticket** : à quelle étape il est, ce qui a été fait, ce qui reste, ce qui le bloque, s'il attend quelque chose du développeur.
- **Revoir les informations d'un ticket** : en revenant sur un ticket après avoir travaillé sur d'autres, retrouver tout ce qui le concerne au même endroit. Cela comprend la description, le contexte, les décisions, les questions et réponses, les échanges, les tests et les fichiers touchés.

Sans outil, ces informations sont éparpillées entre les conversations, la mémoire du développeur et l'outil de tickets. Plus il y a de tickets en parallèle, plus on perd le fil.

## 2. La réponse

project-tracker est **le dossier de suivi de chaque ticket, plus une vue d'ensemble de tous les tickets en cours** :

- **Vue d'ensemble** : tous les tickets du projet, leur étape, et en un coup d'œil ceux qui avancent, ceux qui sont bloqués et ceux qui attendent le développeur.
- **Fiche du ticket** : tout ce qui concerne un ticket, à jour, au même endroit, lisible pour reprendre le fil.
- **Alimentation** : ceux qui travaillent sur le ticket, des agents d'IA le plus souvent, tiennent la fiche à jour au fur et à mesure. Le développeur n'a pas à la remplir.

## 3. Principes

- **Le ticket est l'unité centrale** : tout se rattache à un ticket.
- **Où en est un ticket doit se voir sans chercher.**
- **Rien n'est résumé ni tronqué** dans la fiche : ce qui a été dit ou échangé reste intact.
- **Le développeur ne remplit pas le suivi à la main** : ceux qui font le travail l'alimentent.
- **Tout reste local**, et l'outil est générique, sans nom de client.

## 4. Décisions déjà prises

- [ADR 0002](../adr/0002-perimetre-multi-agents-ouvert.md) : plusieurs types d'agents peuvent alimenter le suivi, pas seulement Claude Code.
- [ADR 0003](../adr/0003-build-a-la-release.md), [0004](../adr/0004-stockage-sqlite.md), [0005](../adr/0005-frontend-svelte.md) : choix techniques, sans effet sur le « quoi ».

## 5. Précisions de l'utilisateur (2026-10-18)

| Question | Réponse de l'utilisateur | Conséquence pour le produit |
|---|---|---|
| Un agent par ticket ? | « Parfois je fais certains tickets, parfois un agent doit en gérer plusieurs, parfois 1. » | Le lien entre un ticket et celui qui le traite est libre. Un agent peut porter plusieurs tickets, et **le développeur est lui-même un intervenant** : il doit pouvoir faire avancer un ticket depuis la page (étape, note), comme un agent. |
| D'où viennent les tickets ? | « Les deux sont possibles. Certains tickets viennent de Jira (ex. : bug en qualité ou en prod, demande de fonctionnalité), parfois ça vient de moi qui demande (ex. : un bug trouvé pendant les tests, une idée de fonctionnalité, une amélioration invisible). » | Deux origines : **importé** d'un outil de tickets (avec sa clé et son lien) ou **créé localement**. Un ticket local doit pouvoir se créer simplement, par le développeur ou par un agent à sa demande. |
| Plusieurs projets ? | « 95 % du temps ce sera un projet, mais de temps en temps peut-être plusieurs (plusieurs serait un bonus). » | **Un projet est le cas normal**. Le multi-projets est une fonctionnalité secondaire, et la conception ne doit pas le rendre impossible. |
