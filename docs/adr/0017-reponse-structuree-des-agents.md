# 0017. Réponse structurée des agents en JSON

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (idée et choix du 2026-10-19)
- Liens : complète l'[ADR 0010](0010-back-end-intervenant-du-ticket.md) (lanceur) ; [0007](0007-acheminement-des-reponses.md), [0011](0011-interface-des-agents.md), [0012](0012-mesure-de-l-usage-ia.md), [0016](0016-stack-serveur-et-validation.md) (Zod)

## Contexte

Idée de l'utilisateur : « Dans le prompt donné aux agents IA, ils doivent répondre un format JSON que tu peux interpréter. »

Aujourd'hui (ADR 0010 et 0011), un agent tient le ticket à jour en appelant l'outil (MCP ou CLI). Cela dépend de sa discipline : un oubli laisse le ticket sans nouvelles. Une réponse finale dans un format imposé peut être lue par un programme et enregistrée sans que l'agent ait à penser à appeler l'outil.

## Options étudiées

| Option | Avantages | Inconvénients |
|---|---|---|
| JSON pour le lanceur seulement (proposition de l'IA) | Là où la sortie est toujours lue par un programme | Les agents front n'en profitent pas |
| **JSON pour tous les agents** | Une seule façon de rendre compte, quel que soit l'agent | Dans une conversation interactive, la sortie n'est lue par un programme que si l'adaptateur sait la capter ; le développeur y voit du JSON |
| Pas maintenant | Rien à faire | L'idée attend l'étape 9 |

## Décision

**Oui, pour tous les agents.**

Fonctionnement retenu :
- **Un seul schéma de réponse**, défini en Zod dans `contract` et transmis dans le texte de lancement (et par l'option de l'outil d'agent qui impose un schéma, quand elle existe). Il contient au moins : le ticket, le statut (`done`, `inProgress`, `blocked`, `question`), un message lisible, la question éventuelle (contexte, options, recommandation), l'avancement (fait, reste), les fichiers modifiés, et l'usage si l'agent le connaît.
- **Qui le lit** :
  - le **lanceur**, pour chaque exécution back-end (`claude -p`, `codex exec`, `opencode run`…) ;
  - l'**adaptateur Claude Code**, à la fin de chaque tour d'un agent front (hook de fin de tour) ;
  - tout autre lecteur de la sortie d'un agent en mode non interactif.
- Le lecteur **valide** le JSON et le transmet au serveur, qui l'enregistre dans le journal et met à jour la situation, comme un appel MCP.
- **JSON invalide ou absent** : la sortie brute est gardée telle quelle dans le journal et marquée « réponse non structurée ». Rien n'est perdu.
- **MCP et CLI restent le socle** : un agent dont la sortie n'est lue par aucun programme (outil interactif sans adaptateur) continue d'appeler l'outil.

## Conséquences

- Le champ « message lisible » garde la conversation compréhensible pour le développeur.
- L'adaptateur Claude Code gagne la lecture de la réponse de fin de tour.
- Risque à vérifier à l'essai de l'étape 9 : la fiabilité du JSON produit par chaque outil d'agent, et l'existence d'une option pour imposer un schéma.
