# 0047. Branche publique des versions stables

- Statut : Acceptée
- Date : 2026-10-21
- Décideur : l'utilisateur (message et réponses du 2026-10-21)
- Liens : complète l'[ADR 0045](0045-projet-open-source-readme-en-anglais.md) (projet open-source) et l'[ADR 0046](0046-installation-et-lancement-par-scripts.md) (releases) ; [plan de l'étape 19](../plan/etape-19.md)

## Contexte

L'utilisateur (2026-10-21) :

> « Pour déployer ce projet on va créer une nouvelle branche remote pour pousser dessus que des versions stables et acceptables. Ce remote n'aura pas tout l'historique de nos commits actuels ni le dossier legacy. »

Le remote est `https://github.com/ClementRoyer/ProjectTracker`. Le développement continue sur `v2`, avec tout son historique, en local.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Branche et historique | `main`, un commit par version (recommandé) ; `stable`, un commit par version ; un seul commit réécrit | « Crée une branche `master` pour ce remote avec un seul commit et le tag version. » |
| 2. Passage d'une version | **script local, push sur accord** (recommandé) ; script qui pousse | Script local, push sur accord |
| 3. Exclus en plus de `legacy/` | `docs/analysis/`, `docs/plan/`, `docs/mockups/` | Les trois |
| 4. Bascule V1 sans `legacy/` | garder le code et copier les données de test (recommandé) ; retirer la bascule | « Ne rien faire, laisser casser sur le dépôt public : ils n'ont pas eu accès à la V1. » |

## Décision

1. **Branche publique `master`** sur le remote, sans lien avec l'historique de `v2`. Elle est préparée en local dans la branche `public` (le `master` local est celui de la V1) et poussée par `git push origin public:master v<version>`.
2. **Un commit par version**, « 🔖 Release v<version> », portant le tag `v<version>`, qui lance la release (ADR 0046). La première version est le seul commit de la branche ; chaque version suivante en ajoute un.
3. **Contenu** : l'état de `v2` au moment de la publication, sans `legacy/`, `docs/analysis/`, `docs/plan/` ni `docs/mockups/`.
4. **`scripts/publish-stable.sh`** : depuis `v2` propre, il lance `npm run verify` et les parcours Playwright, fabrique le commit et le tag en local, puis affiche ce qui partirait et la commande de push. Il ne pousse jamais.
5. **Bascule V1** : rien n'est changé dans le code. Ses deux tests, qui lisent des données de `legacy/`, sautent quand ce dossier est absent : sans cela, le workflow de release échouerait sur la branche publique.

## Conséquences

- Sur la branche publique, `--from-v1` répond que l'installeur V1 est introuvable.
- Les ADR et documents qui renvoient vers les dossiers exclus ont des liens morts côté public ; le README n'en a pas.
- Ce choix sur l'historique est à revoir si l'utilisateur veut, à la place, un seul commit réécrit à chaque version (push forcé).
