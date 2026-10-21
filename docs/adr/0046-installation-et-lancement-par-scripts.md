# 0046. Installation et lancement par scripts, depuis les releases

- Statut : Acceptée
- Date : 2026-10-21
- Décideur : l'utilisateur (message et réponses du 2026-10-21)
- Liens : complète l'[ADR 0030](0030-installation-dans-un-projet.md) (installation dans un projet) et l'[ADR 0010](0010-back-end-intervenant-du-ticket.md) (lanceur back-end) ; [ADR 0045](0045-projet-open-source-readme-en-anglais.md) (projet open-source) ; [plan de l'étape 18](../plan/etape-18.md)

## Contexte

L'utilisateur (2026-10-21) :

> « J'ai l'impression que le déploiement n'est pas simple, surtout pour l'agent back-end. Crée un start.sh pour le front et pour le back-end, ainsi qu'un install.sh. Le but c'est qu'ils soient simples à utiliser, qu'ils posent les questions si nécessaire pour le setup ou le lancement. »

Jusqu'ici, il fallait cloner ce dépôt, construire `dist/`, lancer `install.js`, écrire la configuration à la main, et, pour le back-end, copier `launcher.js` et `hold.js`, écrire `launcher.config.json` et exporter le jeton.

## Options étudiées

| Question | Options | Choix |
|---|---|---|
| 1. Forme | un `install.sh` et deux `start.sh` (recommandé) ; trois scripts dans le dépôt | « Deux install.sh et deux start.sh, front & back à chaque fois. » |
| 2. Arrivée sur le serveur back-end | cloner le dépôt là-bas (recommandé) ; archive à copier ; les deux | « Je vais déployer ce repository, créer des releases, et le script d'install doit être appelé un peu comme les scripts d'install des CLI IA : `curl … install-{back/front}.sh`, et ce script va chercher l'archive en release et soit met à jour, soit installe la nouvelle version. » |
| 3. Secrets au lancement | **demandés une fois, fichier local** (recommandé) ; à chaque lancement ; environnement seulement | Demandés une fois, fichier local |
| 4. Fabrication des releases | **GitHub Actions sur un tag** (recommandé) ; commande locale | GitHub Actions sur un tag |
| 5. Dépôt | — | `https://github.com/ClementRoyer/ProjectTracker` |

## Décision

1. **Quatre scripts** : `install-front.sh`, `install-back.sh`, `start-front.sh`, `start-back.sh`. Les questions et messages sont en français, comme l'interface (ADR 0006).
2. **Installation par `curl`** : `curl -fsSL https://github.com/ClementRoyer/ProjectTracker/releases/latest/download/install-front.sh | bash` (de même pour `install-back.sh`). Le script télécharge l'archive de la release (`project-tracker.tar.gz`), vérifie son empreinte (`SHA256SUMS`) et refuse une archive qui ne correspond pas. `PROJECT_TRACKER_VERSION` choisit une version ; `PROJECT_TRACKER_REPO` un autre dépôt.
3. **Installer ou mettre à jour** : relancer le même script met à jour ce qui est installé. Côté front, c'est `install.js` (ADR 0030) qui fait le travail, base sauvegardée d'abord. Côté back-end, seuls le lanceur et ses scripts sont remplacés ; la configuration et les secrets restent.
4. **Questions** : seulement à l'installation neuve et seulement ce qui manque. Front : dossier du projet, port, Jira (adresse et projet), back-end sur une autre machine (adresse privée). Back-end : dossier d'installation, adresse de l'outil, miroir, commande de l'agent, nombre d'agents en parallèle, proxy. Sans terminal, ou avec `PROJECT_TRACKER_YES=1`, les valeurs par défaut et les variables d'environnement répondent.
5. **Lancement** : `tools/tracker/app/start-front.sh` dans le projet, `start-back.sh` dans le dossier du lanceur. Au premier lancement, ils demandent les secrets qui manquent (saisie masquée) et les rangent dans `secrets.env`, droits 600, ignoré par git. Une variable déjà présente dans l'environnement passe avant. Le jeton du lanceur est généré côté front et affiché une fois, pour l'installation du back-end.
6. **Releases** : un tag `v<version>` (égal à la version du `package.json`) lance un workflow GitHub Actions : `npm run verify`, parcours Playwright, construction, puis release avec l'archive, son empreinte et les deux scripts d'installation.

## Conséquences

- L'archive contient `dist/` et les deux scripts de lancement ; `install.js` copie `start-front.sh` dans `tools/tracker/app/`.
- La bascule depuis la V1 (`--from-v1`) a besoin de l'installeur V1 du dépôt : elle reste une commande lancée depuis un clone, pas depuis l'archive.
- Le serveur back-end a seulement besoin de Node 22.13 et de `curl` : ni git, ni npm, ni build.
