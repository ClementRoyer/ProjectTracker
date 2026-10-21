# Documentation de la refonte V2

Ce dossier rassemble ce qui sert à **piloter la refonte V2** de project-tracker, qui passe d'un skill à une application structurée. Il permet de retrouver plus tard **ce qui a été décidé, quand, et pourquoi**.

La V1 (code et documentation : contrats, journal de décisions `review-2026-10-12.md`, roadmap) est rangée dans `../legacy/` et sert d'historique ([ADR 0018](adr/0018-outillage-et-code-v1.md)).

Les règles pour les agents qui codent sont dans [`../AGENTS.md`](../AGENTS.md) et [`code-style.md`](code-style.md) ([ADR 0019](adr/0019-regles-de-code.md)).

## Organisation

| Dossier | Contenu | Règle de vie |
|---|---|---|
| [`product/`](product/) | Ce que le produit doit faire : compréhension, besoins, fonctionnalités (primaires / secondaires), glossaire. | Document vivant, tenu à jour. Fait foi sur le « quoi ». |
| [`adr/`](adr/) | Décisions d'architecture et de produit, une par fichier, numérotées (ADR). | Une ADR acceptée n'est jamais réécrite : on en crée une nouvelle qui la **remplace**. |
| [`analysis/`](analysis/) | Audits et analyses datés (photographies de l'existant à un instant donné). | Jamais modifiés après coup. Une nouvelle analyse crée un nouveau dossier daté. |
| [`plan/`](plan/) | Plan de la refonte : phases, critères de fin, état d'avancement. | Document vivant, mis à jour à chaque phase. |
| [`architecture.md`](architecture.md) | L'architecture cible, une section par ADR. | Document vivant. |
| [`code-style.md`](code-style.md) | Le guide de style du code, avec un exemple par règle. | Document vivant ; un changement de seuil passe par une ADR. |

## Comment retrouver le « pourquoi »

1. **Une décision** : chercher dans [`adr/README.md`](adr/README.md) (index avec statut). Chaque ADR renvoie vers l'analyse qui l'a motivée.
2. **Un constat sur l'existant** : [`analysis/2026-10-16-audit-v1/`](analysis/2026-10-16-audit-v1/), qui contient l'audit V1 en quatre volets plus une synthèse.
3. **Un besoin ou une fonctionnalité** : [`product/`](product/).
4. **Où en est la refonte** : [`plan/v2-plan.md`](plan/v2-plan.md).

## Conventions

- Langue : français pour les documents, anglais pour le code ([ADR 0006](adr/0006-langues.md)).
- Dates au format `AAAA-MM-JJ`.
- Toute décision prise avec l'utilisateur devient une ADR, rédigée si possible avec ses mots.
