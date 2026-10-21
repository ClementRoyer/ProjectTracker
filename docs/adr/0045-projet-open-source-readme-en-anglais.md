# 0045. Projet open-source : README en anglais, licence MIT

- Statut : Acceptée
- Date : 2026-10-21
- Décideur : l'utilisateur (message et réponse du 2026-10-21)
- Liens : complète l'[ADR 0006](0006-langues.md) (langues) pour le seul README

## Contexte

L'utilisateur (2026-10-21) :

> « Le readme doit être en anglais et plutôt en mode présentation de projet. Le vœu est que ce projet soit open-source et communautaire. »

L'ADR 0006 met la documentation en français. Un projet ouvert à une communauté se présente d'abord par son README, lu par des personnes qui ne parlent pas forcément français. Il faut aussi une licence pour que le code puisse être repris et amélioré.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| Licence | **MIT** (recommandé) ; Apache 2.0 ; AGPL 3.0 ; plus tard | MIT |

## Décision

1. **Le README est en anglais**, écrit comme une présentation de projet : à quoi il sert, ses fonctionnalités, comment il marche, comment l'installer et contribuer.
2. **Licence MIT** : fichier `LICENSE` à la racine, et `"license": "MIT"` dans `package.json`.
3. Le reste ne change pas : documentation dans `docs/` et interface en français, code et commits en anglais (ADR 0006). Le README le dit, et signale qu'une traduction de l'interface serait une contribution bienvenue.

## Conséquences

- Les captures du README montrent une interface en français.
- Toute contribution est publiée sous licence MIT.
