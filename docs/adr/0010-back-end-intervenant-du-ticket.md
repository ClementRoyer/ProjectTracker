# 0010. Le back-end, intervenant du ticket, lancé sur son serveur

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (conception construite avec lui, relue et acceptée le 2026-10-19 : « Oui c'est ok pour moi »)
- Liens : [ADR 0002](0002-perimetre-multi-agents-ouvert.md) (agnostique), [0007](0007-acheminement-des-reponses.md) (acheminement), [0008](0008-eviter-les-conflits-entre-tickets.md) (conflits) ; [features.md](../product/features.md) F6, F7, F14, F16, F33 ; [needs.md](../product/needs.md) M7 ; [architecture.md](../architecture.md) §2.1

## Contexte

Aujourd'hui, le back-end est **une seule conversation Claude Code**, lancée à la main sur le serveur back-end. Les agents front la joignent par le relais d'Anthropic (sessions avec remote-control). L'utilisateur décrit le problème ainsi :

> « Quand plusieurs agents envoient un message au back-end, le contexte devient confus pour lui ou surchargé. Il répond un message avec plusieurs tickets en réponse dedans, n'utilise pas à son avantage la création de plusieurs sessions uniques. »

Sa piste :

> « Le back-end devrait peut-être être un deuxième agent connecté au ticket et géré de la même manière que les agents front (instancié au besoin). »

### Contraintes établies avec l'utilisateur (2026-10-19)

| # | Contrainte | Paroles de l'utilisateur |
|---|---|---|
| K1 | Le code back-end n'existe que sur son serveur. Ce n'est pas un dépôt git, mais un miroir du serveur déployé. | « Ce n'est pas un dépôt git mais un miroir du serveur back-end déployé. » ; « Le code n'existe que là. » |
| K2 | Le serveur back-end n'est utilisé que par le développeur. | « Il est uniquement pour moi. » |
| K3 | Le développeur reporte lui-même les modifications du miroir vers le serveur déployé. Il n'a pas besoin que l'outil suive ces modifications. | « C'est moi qui reprends les modifications du miroir vers le serveur. » ; « Pas besoin de connaître les modifications back-end. » |
| K4 | Pas de SSH fiable entre les machines. Le seul accès commun est Internet en HTTPS sortant. | « Parfois les réseaux d'entreprise l'empêchent. » |
| K5 | Pas d'outil hébergé avec des clients distants : trop lourd à déployer. | « J'ai peur que partir sur un serveur déployé et des clients qui s'y connectent alourdissent beaucoup la solution. » |
| K6 | La solution doit fonctionner avec n'importe quel outil d'agent (ADR 0002). | « Ce n'est pas agnostique du type d'agent IA. » |
| K7 | Le back-end doit réellement s'améliorer. | « Il n'y a pas d'amélioration pour le back-end. » |
| K8 | Intermédiaire réseau accepté : un réseau privé chiffré, auto-hébergé. | « Réseau privé chiffré » ; « Pour Tailscale, on va self-host ça avec la solution communautaire. » |

## Options écartées

| Option | Raison de l'écart |
|---|---|
| Un back-end unique mieux discipliné | Le contexte reste partagé entre les tickets : c'est le problème observé (K7). |
| Un agent back-end connecté par tunnel SSH | Pas de SSH fiable (K4). |
| L'outil hébergé sur un serveur commun | Trop lourd (K5). |
| Le relais d'Anthropic avec une session back-end « relais » et des sous-agents | Propre à Claude Code (K6), sans vraie amélioration (K7). |
| Une copie du miroir par ticket | Proposée par l'IA ; l'utilisateur a préféré travailler directement dans le miroir avec des fichiers tenus. |
| Des verrous de fichiers gérés par l'outil, à travers le réseau | L'utilisateur a proposé des fichiers `.lock` locaux : plus simples, et ils fonctionnent même si sa machine est éteinte. |

## Décision

### 1. Le back-end est un intervenant du ticket

- **Un ticket a un intervenant par rôle** : `front` et `back-end`.
- Les échanges entre les deux sont des **entrées du journal** du ticket, gardées mot pour mot et acheminées selon l'ADR 0007.
- Le back-end n'est plus un « partenaire ». F33 (« échanges avec le back-end outillés ») devient la messagerie entre intervenants d'un même ticket.

### 2. Réseau : un réseau privé chiffré, auto-hébergé (K4, K5, K8)

- Les deux machines rejoignent un réseau privé **Headscale** : le serveur de coordination communautaire et auto-hébergé, utilisé avec les clients Tailscale. Ce serveur doit être joignable en HTTPS par les deux machines. Le trafic entre les machines est chiffré de bout en bout.
- **L'outil reste unique et local**, sur la machine du développeur. Il écoute sur la boucle locale et sur l'interface du réseau privé, **jamais sur Internet**.
- Le serveur back-end joint l'outil à travers ce réseau. Les connexions partent toujours du serveur back-end.

### 3. Le lanceur (K6, K7)

Un **lanceur** est un petit programme de l'outil, installé sur le serveur back-end et démarré une fois à la main par le développeur.

- Il **relève les demandes back-end en attente** auprès de l'outil et envoie des **signes de vie** (« lanceur en ligne »).
- Pour chaque demande, il **démarre un agent neuf** avec une **commande configurable** : `claude -p …`, `codex exec …`, `opencode run …`.
- Le texte de lancement (fiche du ticket, demande, règles) est fourni par l'outil et passé à l'agent **par un fichier**, jamais dans la ligne de commande.
- **Reprise d'un échange** : si l'outil d'agent sait reprendre une conversation, le lanceur utilise la **commande de reprise** configurée. Sinon, il démarre un agent neuf, qui relit la fiche ; elle contient déjà les échanges précédents.
- **Limites configurables** : un seul agent back-end à la fois par ticket, au plus N agents en parallèle (par exemple 3), une durée maximale par exécution.

### 4. Parcours d'une demande back-end

1. L'agent front, ou le développeur, crée une **demande back-end** sur le ticket. Le texte est gardé tel quel dans le journal, et le ticket affiche **« attente : back-end »**.
2. Le lanceur relève la demande et la **prend en charge** au nom du rôle back-end du ticket.
3. Il démarre l'agent. Celui-ci lit la fiche et la demande, puis travaille dans le miroir. Il peut aussi poser une question au développeur, comme n'importe quel intervenant.
4. L'agent **répond par l'outil** (MCP ou CLI). La réponse entre dans le journal, mot pour mot.
5. L'agent front la reçoit selon l'ADR 0007.

### 5. Fichiers tenus dans le miroir : des verrous locaux (proposés par l'utilisateur)

- **Avant de modifier un fichier du miroir, l'agent le déclare** au moyen d'une petite commande locale du lanceur, utilisable par n'importe quel agent.
- Les verrous sont des **fichiers `.lock` créés de façon atomique** : un seul agent peut réussir à créer un verrou donné. Chaque verrou indique le ticket et l'exécution qui tiennent le fichier. Les verrous **vivent hors du miroir**, dans le dossier du lanceur, pour ne jamais partir vers le serveur déployé.
- **Fichier déjà tenu** : la commande indique par quel ticket. L'agent attend ou fait autre chose. L'outil affiche **« attente : fichier tenu par <ticket> »**, information transmise par les signes de vie du lanceur, à titre indicatif seulement.
- **Le lanceur supprime les verrous d'une exécution dès qu'elle se termine**, normalement ou non. Comme il est le parent de chaque agent, aucun verrou ne reste orphelin.
- Ce mécanisme **fonctionne même si la machine du développeur est éteinte**.
- **Garde-fou** : à la fin d'une exécution, le lanceur vérifie qu'aucun fichier du miroir n'a été modifié sans avoir été déclaré. Sinon, il signale « modification non déclarée » sur le ticket. **L'outil n'enregistre ni contenu ni historique des modifications back-end** (K3).

### 6. Sécurité

- L'outil n'est joignable que depuis la machine du développeur et le réseau privé.
- **Le lanceur a son propre jeton**, limité au rôle back-end : relever les demandes, écrire dans le journal des tickets concernés, envoyer des signes de vie. La page garde son jeton anti-falsification.
- **L'outil n'envoie que du texte, jamais de commande.** Le lanceur n'exécute que la commande configurée par le développeur sur le serveur back-end.
- **Le code back-end ne quitte pas son serveur.** Seuls transitent les messages écrits par les agents.

### 7. Pannes

| Panne | Comportement |
|---|---|
| Machine du développeur éteinte, ou réseau coupé | Le lanceur réessaie à intervalles croissants. Les demandes attendent, rien n'est perdu. Les verrous locaux continuent de fonctionner. |
| Lanceur arrêté | La page affiche « lanceur back-end hors ligne ». Les demandes attendent son redémarrage. |
| Agent planté ou dépassant la durée maximale | Le lanceur l'arrête, l'inscrit au journal et libère ses verrous. La demande est marquée en échec, à relancer par le front ou le développeur. |
| Perte de contact avec le lanceur pendant une exécution | L'outil marque la demande « en cours, lanceur injoignable ». Le lanceur la reprend ou la clôt à son retour. |

### 8. Tests

- Le lanceur est testé avec **un faux agent** : une commande factice qui lit son texte de lancement, déclare des fichiers et répond.
- Les tests utilisent des données d'exemple génériques. Ils couvrent les verrous concurrents, la panne d'un agent et la coupure réseau.

## Conséquences

- **Glossaire** :
  - nouveaux termes : rôle, lanceur, exécution, demande back-end ;
  - l'intervenant devient « un par rôle » ;
  - le partenaire ne désigne plus le back-end.
- **Architecture** : l'outil sert son API et le MCP en HTTP, aussi pour des agents distants. Le lanceur est un nouveau composant, livré avec l'outil.
- **Installation** : en plus de l'outil local, une installation légère du lanceur sur le serveur back-end, et la mise en place de Headscale, qui se fait hors de l'outil.
- **Risques à vérifier par un essai** :
  - le réseau d'entreprise laisse-t-il passer Headscale et Tailscale ?
  - le mode non interactif de chaque outil d'agent (lancement et reprise) fonctionne-t-il ?
