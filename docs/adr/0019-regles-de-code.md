# 0019. Règles de code pour les agents : Karpathy et un guide maison

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (demande et choix du 2026-10-19)
- Liens : [AGENTS.md](../../AGENTS.md), [code-style.md](../code-style.md) ; [ADR 0002](0002-perimetre-multi-agents-ouvert.md) (agnostique), [0018](0018-outillage-et-code-v1.md) (ESLint)

## Contexte

Demande de l'utilisateur, avant tout code du POC : « J'ai besoin que tu mettes en place des règles de code afin de suivre les bons principes, d'avoir un code lisible et professionnel. Est-ce que tu peux chercher en ligne un truc pour ça à donner à un agent ? Un truc populaire. »

Recherche du 2026-10-19 :
- Les règles les plus populaires pour les agents sont celles tirées des notes d'Andrej Karpathy sur les erreurs des LLM qui codent ([forrestchang/andrej-karpathy-skills](https://github.com/forrestchang/andrej-karpathy-skills), environ 221 000 étoiles). Ce sont quatre règles de **comportement** : réfléchir avant de coder, la simplicité d'abord, des changements chirurgicaux, viser un résultat vérifiable. Rien sur la forme du code. Le dépôt n'affiche pas de licence.
- La référence pour un TypeScript lisible est le [guide de style de Google](https://google.github.io/styleguide/tsguide.html), trop long pour être donné tel quel.
- Les collections de règles (awesome-cursorrules) sont populaires mais de qualité inégale.
- Les guides sur ces fichiers conseillent : des règles précises plutôt que « écris du code propre », un linter pour tout ce qui se vérifie, un fichier racine court qui renvoie à des fichiers par thème, et un `AGENTS.md` lu par tous les outils d'agent.

## Options étudiées

| Option | Avantages | Inconvénients |
|---|---|---|
| **Karpathy + guide maison** | Comportement de l'agent et forme du code ; règles vérifiables dans ESLint | Un guide à tenir à jour |
| Karpathy seul | Court, éprouvé | Rien sur la forme du code |
| Guide Google en référence | Le standard | Long, ne cadre pas le comportement de l'agent |

## Décision

**Karpathy + guide maison** (proposition de l'IA).

- **`AGENTS.md`** à la racine, lu par tous les outils d'agent ; `CLAUDE.md` ne fait que l'importer (`@AGENTS.md`). Il contient le contexte du projet, les quatre règles Karpathy **reformulées** avec la source citée (pas de licence, donc pas de copie), et les règles non négociables.
- **[`docs/code-style.md`](../code-style.md)** : les règles que l'outil ne vérifie pas, chacune avec un exemple « à faire / à éviter ». Elles viennent du guide de Google et du guide de style de la V1.
- **Ce qui se vérifie va dans ESLint** : exports nommés seulement, types de retour explicites sur ce qui est exporté, `switch` exhaustif, pas de ternaire imbriqué, `===`, `const`, pas de `console` dans `core`, complexité 10, profondeur 3, 4 paramètres, 60 lignes par fonction et 400 lignes par fichier (hors tests).
- **Le plafond de 400 lignes n'a pas d'exception.** La V1 avait des « tailles assumées » relevées module par module, et leur suivi a encombré sa documentation (audit V1).

## Conséquences

- Tout agent, quel que soit son outil, lit les mêmes règles.
- Un seuil ESLint qui gêne se discute avec l'utilisateur et se change dans une nouvelle ADR, pas par une exception locale.
