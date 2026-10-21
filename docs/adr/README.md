# Décisions (ADR)

Une ADR (*Architecture Decision Record*) consigne **une** décision : le contexte, les options étudiées, le choix et ses conséquences. Elles servent à retrouver plus tard **pourquoi** le projet est fait ainsi.

## Index

| N° | Titre | Statut | Date |
|---|---|---|---|
| [0001](0001-consigner-les-decisions-en-adr.md) | Consigner les décisions de la V2 en ADR | Acceptée | 2026-10-16 |
| [0002](0002-perimetre-multi-agents-ouvert.md) | Périmètre V2 : local, multi-agents ouvert | Acceptée | 2026-10-16 |
| [0003](0003-build-a-la-release.md) | Dépendances et build dans le dépôt, artefact autonome livré | Acceptée | 2026-10-16 |
| [0004](0004-stockage-sqlite.md) | Stockage en SQLite natif (`node:sqlite`) | Acceptée | 2026-10-16 |
| [0005](0005-frontend-svelte.md) | Page web en Svelte + Vite + TypeScript | Acceptée | 2026-10-16 |
| [0006](0006-langues.md) | Code en anglais, interface et documents en français | Acceptée | 2026-10-18 |
| [0007](0007-acheminement-des-reponses.md) | Acheminement de la réponse du développeur à l'agent | Acceptée | 2026-10-18 |
| [0008](0008-eviter-les-conflits-entre-tickets.md) | Éviter les conflits entre tickets traités en parallèle | Acceptée | 2026-10-19 |
| [0009](0009-apercu-et-commits-des-dossiers-de-travail.md) | Aperçu et commits des dossiers de travail | Acceptée | 2026-10-19 |
| [0010](0010-back-end-intervenant-du-ticket.md) | Le back-end, intervenant du ticket, lancé sur son serveur | Acceptée | 2026-10-19 |
| [0011](0011-interface-des-agents.md) | Interface des agents : un serveur unique, une identité par conversation | Acceptée | 2026-10-19 |
| [0012](0012-mesure-de-l-usage-ia.md) | Mesure de l'usage IA : mesuré, sinon déclaré | Acceptée | 2026-10-19 |
| [0013](0013-base-par-projet-et-sauvegarde.md) | Une base par projet, dans le dépôt, sauvegardée à la main | Acceptée | 2026-10-19 |
| [0014](0014-decoupage-en-paquets.md) | Découpage du code en paquets | Acceptée | 2026-10-19 |
| [0015](0015-modele-de-donnees.md) | Modèle de données : état courant et journal immuable | Acceptée | 2026-10-19 |
| [0016](0016-stack-serveur-et-validation.md) | Stack : Svelte confirmé, Hono pour le serveur, Zod pour la validation | Acceptée | 2026-10-19 |
| [0017](0017-reponse-structuree-des-agents.md) | Réponse structurée des agents en JSON | Acceptée | 2026-10-19 |
| [0018](0018-outillage-et-code-v1.md) | Outillage du dépôt et place du code V1 | Acceptée | 2026-10-19 |
| [0019](0019-regles-de-code.md) | Règles de code pour les agents : Karpathy et un guide maison | Acceptée | 2026-10-19 |
| [0020](0020-suites-du-poc-de-connexion.md) | Suites du POC de connexion : push, JSON des agents front, champs fixés par le lanceur | Acceptée | 2026-10-19 |
| [0021](0021-suites-du-poc-reseau-et-lanceur.md) | Suites du POC, partie B : réseau sans TUN, relance des demandes bloquées, garde-fou en parallèle | Acceptée | 2026-10-19 |
| [0022](0022-regles-du-domaine-confirmees.md) | Règles du domaine confirmées | Acceptée | 2026-10-19 |
| [0023](0023-acces-a-la-base-en-sql.md) | Accès à la base : SQL écrit à la main sur node:sqlite | Acceptée | 2026-10-19 |
| [0024](0024-migration-des-donnees-v1.md) | Migration des données V1 vers la base V2 | Acceptée | 2026-10-19 |
| [0025](0025-maquettes-du-front.md) | Maquettes du front : pages HTML publiées, fil de fer puis version fidèle | Acceptée | 2026-10-19 |
| [0026](0026-operations-cli-configuration-jira.md) | Catalogue d'opérations, CLI, configuration et client Jira | Acceptée | 2026-10-19 |
| [0027](0027-authentification-du-developpeur.md) | Authentification du développeur auprès du serveur | Acceptée | 2026-10-19 |
| [0028](0028-page-svelte.md) | Page Svelte : structure, styles, navigation, tests, agent actif | Acceptée | 2026-10-20 |
| [0029](0029-suites-de-la-page.md) | Suites de la page : dossier, nouveautés, devise, livraison | Acceptée | 2026-10-20 |
| [0030](0030-installation-dans-un-projet.md) | Installation dans un projet, branchement de Claude Code, sauvegarde à la mise à jour | Acceptée | 2026-10-20 |
| [0031](0031-bascule-d-un-projet-v1.md) | Bascule d'un projet V1 : la V1 mise de côté | Acceptée | 2026-10-20 |
| [0032](0032-niveaux-de-priorite.md) | Niveaux de priorité d'un ticket | Acceptée | 2026-10-20 |
| [0033](0033-priorite-pour-toutes-les-demandes.md) | La priorité ordonne toutes les demandes back-end | Acceptée | 2026-10-20 |
| [0034](0034-ressources-tests-nouveautes.md) | Ressources partagées, passages de tests, écran des nouveautés | Acceptée | 2026-10-20 |
| [0035](0035-pieces-jointes.md) | Pièces jointes d'un ticket | Acceptée | 2026-10-20 |
| [0036](0036-notifications.md) | Notifications | Acceptée | 2026-10-20 |
| [0037](0037-changelog-de-livraison.md) | Changelog de livraison | Acceptée | 2026-10-20 |
| [0038](0038-proposition-de-la-suite.md) | Proposition de la suite | Acceptée | 2026-10-20 |
| [0039](0039-plusieurs-projets.md) | Plusieurs projets : un sélecteur | Acceptée | 2026-10-20 |
| [0040](0040-depots-groupes-documents.md) | Dépôts, groupes de tickets, documents de référence | Acceptée | 2026-10-20 |
| [0041](0041-dossier-de-travail-par-ticket.md) | Dossier de travail par ticket | Acceptée | 2026-10-20 |
| [0042](0042-apercu-par-branche-d-integration.md) | Aperçu par branche d’intégration : mise en œuvre | Acceptée | 2026-10-20 |
| [0043](0043-commande-de-commit.md) | Commande de commit | Acceptée | 2026-10-21 |
| [0044](0044-reunion-des-branches-a-la-livraison.md) | Réunion des branches à la livraison | Acceptée | 2026-10-21 |
| [0045](0045-projet-open-source-readme-en-anglais.md) | Projet open-source : README en anglais, licence MIT | Acceptée | 2026-10-21 |
| [0046](0046-installation-et-lancement-par-scripts.md) | Installation et lancement par scripts, depuis les releases | Acceptée | 2026-10-21 |
| [0047](0047-branche-publique-des-versions-stables.md) | Branche publique des versions stables | Acceptée | 2026-10-21 |

## Règles

- **Statuts** : `Proposée` → `Acceptée` ou `Rejetée` ; plus tard, éventuellement `Remplacée par NNNN`.
- **Une ADR acceptée n'est pas réécrite.** Pour changer d'avis, on crée une nouvelle ADR qui la remplace, puis on met à jour le statut de l'ancienne. C'est la seule modification permise.
- **Seul l'utilisateur accepte une décision.** Une proposition de l'IA reste `Proposée` tant qu'il ne l'a pas validée explicitement. Cela corrige un défaut de la V1, où des choix proposés n'ont jamais été confirmés (voir [audit produit](../analysis/2026-10-16-audit-v1/product.md), §4).
- **Nom de fichier** : `NNNN-titre-en-kebab-case.md`, avec une numérotation continue.

## Modèle

```markdown
# NNNN. Titre

- Statut : Proposée | Acceptée | Rejetée | Remplacée par NNNN
- Date : AAAA-MM-JJ
- Décideur : l'utilisateur (et comment : question, message…)
- Liens : analyse, ADR liées

## Contexte
Le problème et les contraintes.

## Options étudiées
Chaque option avec ses avantages et ses inconvénients.

## Décision
Le choix retenu, avec les mots de l'utilisateur si possible.

## Conséquences
Ce que cela implique, ce qui devient plus facile ou plus difficile, ce qu'il reste à faire.
```
