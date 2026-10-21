# 0042. Aperçu par branche d'intégration : mise en œuvre

- Statut : Acceptée
- Date : 2026-10-20
- Décideur : l'utilisateur (réponses du 2026-10-20)
- Liens : met en œuvre l'[ADR 0009](0009-apercu-et-commits-des-dossiers-de-travail.md) (branche d'intégration, un seul serveur, reconstruction par commande, conflits signalés) ; [ADR 0041](0041-dossier-de-travail-par-ticket.md) (dossiers de travail) ; [plan de l'étape 15](../plan/etape-15.md)

## Contexte

L'ADR 0009 a retenu une branche d'intégration `preview`, reconstruite à partir de la branche principale en y réunissant les branches des tickets en cours, avec un seul serveur de développement dessus. Restaient à dire : quels tickets entrent, que faire d'un conflit, qui fait tourner le serveur, et où la page le montre.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Tickets réunis | **ouverts avec un dossier de travail** (recommandé) ; choisis à chaque reconstruction ; ouverts sauf exclus | Ouverts avec un dossier |
| 2. Conflit de réunion | **laisser la branche de côté** (recommandé) ; tout arrêter | La laisser de côté |
| 3. Serveur de développement | **lancé une fois par le développeur** (recommandé) ; relancé par la CLI | Lancé une fois par le développeur |
| 4. Affichage | **en-tête et ticket** (recommandé) ; bilan et ticket ; ticket seulement | En-tête et ticket |

## Décision

1. **Reconstruire** : `tracker preview build [--base <branche>]`, lancée par le développeur ou un agent, jamais par la page. Le dossier est `.worktrees/preview`, sur la branche `preview` remise à la base (`--base`, sinon `main`) à chaque reconstruction. La branche `preview` est jetable : jamais poussée, ses commits de réunion sont signés `project-tracker`.
2. **Tickets réunis** : les tickets ouverts qui ont un dossier de travail, dans l'ordre de leurs clés. Seul le code commité entre.
3. **Conflit** : la réunion de la branche est annulée et les autres entrent quand même. Le ticket est signalé « conflit avec l'aperçu », avec les fichiers en cause et les tickets déjà réunis qui les modifient. Le journal du ticket le note quand le conflit apparaît ou change, pas à chaque reconstruction.
4. **Plusieurs dépôts** : la même chose dans chaque dépôt, sous `.worktrees/preview/<chemin du dépôt>`. Un conflit dans un dépôt laisse le ticket de côté dans tous.
5. **Serveur** : le développeur le lance lui-même dans `.worktrees/preview` ; la reconstruction met les fichiers à jour et le rechargement à chaud suit. La configuration peut donner `preview.setup` (par exemple `npm ci`), lancée dans le dossier après chaque reconstruction.
6. **Page** : une pastille dans l'en-tête (« Aperçu : 4 tickets · il y a 5 min », en alerte s'il y a un conflit) ; le dossier du ticket dit « Dans l'aperçu » ou « Conflit avec l'aperçu ».

## Conséquences

- Opérations nouvelles : lister les dossiers de travail des tickets ouverts ; noter une reconstruction ; lire l'état de l'aperçu.
- La base garde la dernière reconstruction, dans la table `preview` prévue dès le schéma initial (ADR 0015).
- La configuration gagne `preview` : `{ "setup": "npm ci" }`, facultatif.
- La commande de commit de l'ADR 0009 reste à faire.
