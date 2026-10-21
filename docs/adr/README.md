# Decisions (ADR)

An ADR (*Architecture Decision Record*) records **one** decision: the context, the options considered, the choice and its consequences. They serve to find later **why** the project is built this way.

## Index

| No. | Title | Status | Date |
|---|---|---|---|
| [0001](0001-consigner-les-decisions-en-adr.md) | Record the V2 decisions as ADRs | Accepted | 2026-10-16 |
| [0002](0002-perimetre-multi-agents-ouvert.md) | V2 scope: local, open to multiple agents | Accepted | 2026-10-16 |
| [0003](0003-build-a-la-release.md) | Dependencies and build in the repository, standalone artifact shipped | Accepted | 2026-10-16 |
| [0004](0004-stockage-sqlite.md) | Storage in native SQLite (`node:sqlite`) | Accepted | 2026-10-16 |
| [0005](0005-frontend-svelte.md) | Web page in Svelte + Vite + TypeScript | Accepted | 2026-10-16 |
| [0006](0006-langues.md) | Code in English, interface and documents in French | Accepted | 2026-10-18 |
| [0007](0007-acheminement-des-reponses.md) | Routing of the developer's answer to the agent | Accepted | 2026-10-18 |
| [0008](0008-eviter-les-conflits-entre-tickets.md) | Avoid conflicts between tickets worked on in parallel | Accepted | 2026-10-19 |
| [0009](0009-apercu-et-commits-des-dossiers-de-travail.md) | Preview and commits of the working folders | Accepted | 2026-10-19 |
| [0010](0010-back-end-intervenant-du-ticket.md) | The back-end, assignee of the ticket, launched on its server | Accepted | 2026-10-19 |
| [0011](0011-interface-des-agents.md) | Agent interface: one server, one identity per conversation | Accepted | 2026-10-19 |
| [0012](0012-mesure-de-l-usage-ia.md) | Measuring AI usage: measured, otherwise declared | Accepted | 2026-10-19 |
| [0013](0013-base-par-projet-et-sauvegarde.md) | One database per project, in the repository, backed up by hand | Accepted | 2026-10-19 |
| [0014](0014-decoupage-en-paquets.md) | Splitting the code into packages | Accepted | 2026-10-19 |
| [0015](0015-modele-de-donnees.md) | Data model: current state and immutable journal | Accepted | 2026-10-19 |
| [0016](0016-stack-serveur-et-validation.md) | Stack: Svelte confirmed, Hono for the server, Zod for validation | Accepted | 2026-10-19 |
| [0017](0017-reponse-structuree-des-agents.md) | Structured answers from agents in JSON | Accepted | 2026-10-19 |
| [0018](0018-outillage-et-code-v1.md) | Repository tooling and place of the V1 code | Accepted | 2026-10-19 |
| [0019](0019-regles-de-code.md) | Code rules for agents: Karpathy and an in-house guide | Accepted | 2026-10-19 |
| [0020](0020-suites-du-poc-de-connexion.md) | Follow-ups of the connection POC: push, JSON from the front agents, fields set by the launcher | Accepted | 2026-10-19 |
| [0021](0021-suites-du-poc-reseau-et-lanceur.md) | Follow-ups of the POC, part B: network without TUN, relaunch of blocked requests, guardrail in parallel | Accepted | 2026-10-19 |
| [0022](0022-regles-du-domaine-confirmees.md) | Confirmed domain rules | Accepted | 2026-10-19 |
| [0023](0023-acces-a-la-base-en-sql.md) | Database access: SQL written by hand on node:sqlite | Accepted | 2026-10-19 |
| [0024](0024-migration-des-donnees-v1.md) | Migration of the V1 data to the V2 database | Accepted | 2026-10-19 |
| [0025](0025-maquettes-du-front.md) | Front mockups: published HTML pages, wireframes then faithful version | Accepted | 2026-10-19 |
| [0026](0026-operations-cli-configuration-jira.md) | Operations catalog, CLI, configuration and Jira client | Accepted | 2026-10-19 |
| [0027](0027-authentification-du-developpeur.md) | Developer authentication with the server | Accepted | 2026-10-19 |
| [0028](0028-page-svelte.md) | Svelte page: structure, styles, navigation, tests, active agent | Accepted | 2026-10-20 |
| [0029](0029-suites-de-la-page.md) | Follow-ups of the page: record, novelties, currency, delivery | Accepted | 2026-10-20 |
| [0030](0030-installation-dans-un-projet.md) | Installation in a project, hooking up Claude Code, backup on update | Accepted | 2026-10-20 |
| [0031](0031-bascule-d-un-projet-v1.md) | Switch-over of a V1 project: V1 set aside | Accepted | 2026-10-20 |
| [0032](0032-niveaux-de-priorite.md) | Priority levels of a ticket | Accepted | 2026-10-20 |
| [0033](0033-priorite-pour-toutes-les-demandes.md) | Priority orders all back-end requests | Accepted | 2026-10-20 |
| [0034](0034-ressources-tests-nouveautes.md) | Shared resources, test runs, novelties screen | Accepted | 2026-10-20 |
| [0035](0035-pieces-jointes.md) | Attachments on a ticket | Accepted | 2026-10-20 |
| [0036](0036-notifications.md) | Notifications | Accepted | 2026-10-20 |
| [0037](0037-changelog-de-livraison.md) | Delivery changelog | Accepted | 2026-10-20 |
| [0038](0038-proposition-de-la-suite.md) | Proposal for what's next | Accepted | 2026-10-20 |
| [0039](0039-plusieurs-projets.md) | Several projects: a selector | Accepted | 2026-10-20 |
| [0040](0040-depots-groupes-documents.md) | Repositories, ticket groups, reference documents | Accepted | 2026-10-20 |
| [0041](0041-dossier-de-travail-par-ticket.md) | Working folder per ticket | Accepted | 2026-10-20 |
| [0042](0042-apercu-par-branche-d-integration.md) | Preview by integration branch: implementation | Accepted | 2026-10-20 |
| [0043](0043-commande-de-commit.md) | Commit command | Accepted | 2026-10-21 |
| [0044](0044-reunion-des-branches-a-la-livraison.md) | Merging branches at delivery | Accepted | 2026-10-21 |
| [0045](0045-projet-open-source-readme-en-anglais.md) | Open-source project: English README, MIT license | Accepted | 2026-10-21 |
| [0046](0046-installation-et-lancement-par-scripts.md) | Installation and launch by scripts, from releases | Accepted | 2026-10-21 |
| [0047](0047-branche-publique-des-versions-stables.md) | Public branch of stable versions | Accepted | 2026-10-21 |
| [0048](0048-documentation-en-anglais.md) | Documentation in English | Accepted | 2026-10-21 |
| [0049](0049-v1-mise-de-cote-sans-migration.md) | V1 set aside without migration | Accepted | 2026-10-21 |

## Rules

- **Statuses**: `Proposed` → `Accepted` or `Rejected`; later, possibly `Superseded by NNNN`.
- **An accepted ADR is never rewritten.** To change one's mind, create a new ADR that replaces it, then update the status of the old one. This is the only change allowed.
- **Only the user accepts a decision.** An AI proposal stays `Proposed` until the user has explicitly validated it. This corrects a flaw of V1, where proposed choices were never confirmed (see [product audit](../analysis/2026-10-16-audit-v1/product.md), §4).
- **File name**: `NNNN-titre-en-kebab-case.md`, with continuous numbering.

## Template

```markdown
# NNNN. Title

- Status: Proposed | Accepted | Rejected | Superseded by NNNN
- Date: YYYY-MM-DD
- Decider: the user (and how: question, message…)
- Links: analysis, linked ADRs

## Context
The problem and the constraints.

## Options considered
Each option with its advantages and disadvantages.

## Decision
The chosen option, with the user's words if possible.

## Consequences
What this implies, what becomes easier or harder, what remains to be done.
```
