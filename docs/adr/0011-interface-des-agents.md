# 0011. Interface des agents : un serveur unique, une identité par conversation

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (réponses aux trois questions du 2026-10-19)
- Liens : [ADR 0002](0002-perimetre-multi-agents-ouvert.md) (agnostique), [0004](0004-stockage-sqlite.md) (SQLite), [0007](0007-acheminement-des-reponses.md) (acheminement), [0010](0010-back-end-intervenant-du-ticket.md) (lanceur distant) ; [architecture.md](../architecture.md) §2.2 ; [glossaire](../product/glossary.md) (agent, conversation, intervenant)

## Contexte

Les agents, quel que soit leur outil (ADR 0002), doivent lire et écrire les tickets. La V1 n'a qu'une CLI, qui écrit directement dans les fichiers de données en concurrence avec le serveur : d'où les verrous maison et les intentions `.pending/`. L'agent s'y identifie par un nom déclaré à chaque appel (`--agent`).

Depuis l'ADR 0010, un client distant (le lanceur) passe déjà par HTTP. Trois questions restaient ouvertes : par où passent les agents, comment ils s'identifient, et que faire si le serveur n'est pas lancé.

## Options étudiées

### 1. Par où passent les agents

| Option | Avantages | Inconvénients |
|---|---|---|
| **Serveur unique HTTP** : la page, l'API, le MCP (en HTTP) et la CLI passent par le serveur local, seul à écrire dans la base | Un seul écrivain ; une seule logique métier ; déjà nécessaire pour le lanceur distant | Le serveur doit tourner pour que les agents travaillent |
| MCP en stdio et CLI qui écrivent directement dans SQLite | Pas besoin du serveur pour les agents locaux | Plusieurs écrivains concurrents (le problème des verrous V1) ; il faut quand même le HTTP pour le lanceur |
| CLI seulement | Le plus simple, fonctionne partout | Pas d'outils typés pour les agents qui gèrent le MCP ; sortie texte à interpréter |

### 2. Identification d'un agent

| Option | Avantages | Inconvénients |
|---|---|---|
| **Nom stable + jeton de conversation** | Distingue deux conversations du même agent ; rattache sans erreur réponses, prise en charge et usage | Une étape de présentation au démarrage, faite par les adaptateurs |
| Nom seul à chaque appel (V1) | Le plus simple | Deux conversations de même nom sont confondues ; une faute de frappe crée un faux intervenant |
| Jeton fixe par agent, configuré | Le plus strict | Lourd : tout configurer avant de lancer un agent |

### 3. Serveur non lancé

| Option | Avantages | Inconvénients |
|---|---|---|
| La CLI démarre le serveur | Transparent pour les agents | Un processus lancé implicitement, plus difficile à suivre |
| **Erreur claire, démarrage à la main** | Simple et prévisible ; le développeur sait toujours ce qui tourne | Un agent est bloqué tant que le serveur n'est pas lancé |
| Service système permanent | Toujours disponible | Dépend du système d'exploitation ; installation plus lourde |

## Décision

| Question | Choix de l'utilisateur |
|---|---|
| Par où passent les agents | **Serveur unique HTTP** (proposition de l'IA) |
| Identification | **Nom stable + jeton de conversation** (proposition de l'IA) |
| Serveur non lancé | **Erreur claire, démarrage à la main** (et non le démarrage automatique proposé par l'IA) |

Fonctionnement retenu :
- **Le serveur local est la seule porte d'entrée vers la base.** Il sert la page (HTTP + flux d'événements), l'API HTTP, le MCP en HTTP et l'accès du lanceur. Lui seul ouvre la base SQLite.
- **La CLI est un client mince de l'API HTTP.** MCP et CLI offrent les mêmes opérations, avec la même logique côté serveur.
- **Au démarrage, un agent se présente** avec un nom stable (par exemple `front-1`) et reçoit un **jeton de conversation**. Ce jeton accompagne chaque appel : en-tête pour le MCP, variable d'environnement pour la CLI. Une reprise ouvre une nouvelle conversation avec le même nom. Les adaptateurs (Claude Code, lanceur) font la présentation automatiquement.
- **Si le serveur ne répond pas**, la CLI et le MCP échouent avec un message clair qui dit comment le lancer. Rien n'est démarré implicitement. Le lanceur distant réessaie, comme prévu par l'ADR 0010.

## Conséquences

- Les verrous de fichiers de données et les intentions `.pending/` de la V1 disparaissent : SQLite et un seul écrivain les remplacent.
- Le jeton de conversation est distinct du jeton de la page et de celui du lanceur ; chacun n'ouvre que ses opérations.
- Les consignes données aux agents disent quoi faire si le serveur ne répond pas : signaler au développeur, ne pas contourner.
- Le développeur lance le serveur lui-même (`tracker serve`) ; l'installation et la documentation le disent dès le début.
