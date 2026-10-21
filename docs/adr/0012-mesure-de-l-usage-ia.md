# 0012. Mesure de l'usage IA : mesuré, sinon déclaré

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (réponses aux deux questions du 2026-10-19)
- Liens : [features.md](../product/features.md) F20 (primaire) ; [needs.md](../product/needs.md) ; [ADR 0002](0002-perimetre-multi-agents-ouvert.md) (agnostique), [0010](0010-back-end-intervenant-du-ticket.md) (lanceur), [0011](0011-interface-des-agents.md) (jeton de conversation) ; [glossaire](../product/glossary.md) (usage)

## Contexte

Besoin exprimé par l'utilisateur : « J'ai besoin de savoir en gros un usage par ticket et, niveau dashboard, un usage journalier, semaine et mensuel. »

Chaque outil d'agent expose son usage à sa façon. Claude Code l'écrit dans la conversation enregistrée, et `claude -p` ou `codex exec` le donnent dans leur sortie JSON. D'autres outils ne l'exposent pas. La V1 relevait l'usage par un hook propre à Claude Code.

## Options étudiées

### Source des chiffres

| Option | Avantages | Inconvénients |
|---|---|---|
| **En couches : mesuré, sinon déclaré** | Fiable quand c'est possible ; aucun outil absent des totaux | Deux qualités de chiffres à distinguer à l'affichage |
| Mesuré seulement | Chiffres fiables | Les outils sans mesure n'apparaissent pas |
| Déclaré seulement | Le plus neutre | Peu fiable (oubli, estimation par le modèle) ; la déclaration consomme elle-même de l'usage |

### Unité

| Option | Avantages | Inconvénients |
|---|---|---|
| **Jetons + coût estimé** | Le coût rend les tickets comparables | Une table de prix à tenir à jour |
| Jetons seulement | Brut et fiable | Moins parlant |
| Part d'un quota d'abonnement | Dit si le quota va manquer | La limite réelle est mal connue |

## Décision

| Question | Choix de l'utilisateur |
|---|---|
| Source | **En couches : mesuré, sinon déclaré** (proposition de l'IA) |
| Unité | **Jetons + coût estimé** (proposition de l'IA) |

Fonctionnement retenu :
- **Mesuré** : quand l'outil donne des chiffres, l'adaptateur les relève sans action de l'agent. Le hook Claude Code lit les jetons de la conversation, et le lanceur lit la sortie JSON de la commande d'agent.
- **Déclaré** : pour les autres outils, l'agent déclare son usage par l'interface (MCP ou CLI).
- Chaque relevé porte sa **provenance** (`measured` ou `declared`), son modèle, ses jetons (entrée, sortie, cache) et sa date.
- **Rattachement** : un relevé est rattaché, par le jeton de conversation (ADR 0011), au ticket que la conversation a en charge à ce moment. S'il n'y en a aucun, il compte dans l'usage du jour sans ticket.
- **Coût estimé** : il est calculé à partir d'une **table de prix par modèle, configurable dans un fichier**. Il reste indicatif, même avec un abonnement. Un modèle absent de la table affiche ses jetons sans coût.
- **Affichage** : l'usage par ticket sur la fiche, et des totaux par jour, semaine et mois sur le tableau de bord. La part mesurée et la part déclarée sont visibles.

## Conséquences

- L'adaptateur Claude Code comprend un relevé d'usage ; le lanceur relève l'usage de chaque exécution.
- Le modèle de données gagne des relevés d'usage, avec leur provenance.
- La table de prix fait partie de la configuration ; une table par défaut est livrée et datée.
