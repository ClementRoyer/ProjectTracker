# Architecture

- Statut : **cible arrêtée** (étape 5 du [plan](plan/v2-plan.md), 2026-10-19)
- Décisions : [ADR](adr/README.md)

## 1. Aujourd'hui (V1.2, 2026-10-19)

Description de l'existant, pour servir de point de départ. Ce n'est pas la cible.

```
 MACHINE DU DÉVELOPPEUR                                    SERVEUR BACK-END
 ┌──────────────────────────────────────────────────┐      ┌──────────────────────┐
 │                                                  │      │                      │
 │  Navigateur ── page du tableau de bord           │      │  Session Claude Code │
 │      │  HTTP + SSE (localhost:9500)              │      │  back-end (unique,   │
 │      ▼                                           │      │  lancée à la main,   │
 │  ┌────────────── tools/tracker/ ──────────────┐  │      │  remote-control)     │
 │  │ serveur HTTP (node) ──lit──┐               │  │      │      │               │
 │  │                            ▼               │  │      │      │ modifie       │
 │  │ CLI tracker ──écrit──► fichiers JSON/JSONL │  │      │      ▼               │
 │  │   (verrous fichiers,   projects/<id>/…     │  │      │  Miroir du back-end  │
 │  │    intentions .pending)                    │  │      │  (pas de git)        │
 │  │ lecture Jira (API) ◄── config + variables  │  │      │      │               │
 │  └──────────────▲─────────────────────────────┘  │      └──────┼───────────────┘
 │                 │ appels CLI                     │             │ report manuel
 │  ┌──────────────┴─────────────────────────────┐  │             ▼
 │  │ Sessions Claude Code front                 │  │      ┌──────────────────────┐
 │  │  • conversation « à l'écoute » (aiguilleur)│  │      │ Serveur back-end     │
 │  │    watch sous Monitor, relancé < 30 min    │  │      │ déployé              │
 │  │  • sous-agents par ticket (≤ 3)            │  │      └──────────────────────┘
 │  │  • hooks : consignes, garde, capture,      │  │
 │  │    usage, réinjection après compaction     │  │
 │  │  un seul dossier de code partagé (git)     │  │
 │  └──────────────────────┬─────────────────────┘  │
 │                         │                        │
 └─────────────────────────┼────────────────────────┘
                           │  messages entre sessions (remote-control)
                           ▼
                ┌──────────────────────┐
                │  Relais Anthropic    │◄──────── session back-end
                └──────────────────────┘
```

Points saillants :
- **Tout l'outil est local**, copié dans le projet (`tools/tracker/`). Le serveur et la CLI lisent et écrivent les mêmes fichiers, d'où les verrous maison.
- **Aucun lien réseau direct** entre la machine du développeur et le serveur back-end. Les sessions se parlent par le relais d'Anthropic. Le réseau d'entreprise empêche parfois le SSH.
- **Le back-end** est une seule session, partagée par tous les tickets. Elle modifie un miroir sans git, que le développeur reporte à la main sur le serveur déployé.
- **Les échanges avec le back-end** sont captés par des hooks côté front, puis rangés dans le ticket.

## 2. Cible (V2)

Les décisions acceptées sont : acheminement des réponses (0007), conflits et dossiers de travail (0008), aperçu et commits (0009), back-end (0010), interface des agents (0011), usage IA (0012), base et sauvegarde (0013), paquets (0014), modèle de données (0015), stack (0016), réponse structurée des agents (0017), suites du POC de connexion (0020, 0021).

### 2.1 Back-end ([ADR 0010](adr/0010-back-end-intervenant-du-ticket.md), [0021](adr/0021-suites-du-poc-reseau-et-lanceur.md))

- Sans TUN, Tailscale en mode userspace : l'outil écoute sur la boucle locale seulement, protégé par une règle d'accès Headscale (le serveur back-end, sur le port de l'outil). Le lanceur peut passer par un proxy HTTP.
- Demande bloquée par un fichier tenu : relancée automatiquement à la libération, par priorité du ticket puis ordre d'arrivée. Modification non déclarée pendant plusieurs exécutions : signalée sur chaque ticket en cours, « auteur incertain ».

```
 MACHINE DU DÉVELOPPEUR                         SERVEUR BACK-END (le code reste ici)
 ┌────────────────────────────────────┐        ┌─────────────────────────────────────┐
 │  Page web ──► OUTIL (serveur local)│        │  LANCEUR (démarré une fois à la     │
 │               • base SQLite        │◄──────►│  main)                              │
 │               • API HTTP + MCP     │ réseau │   │ relève les demandes back-end    │
 │                    ▲               │ privé  │   ▼ lance un agent neuf par demande │
 │  Agents front ─────┘ (MCP ou CLI)  │chiffré │  Agent back-end « ticket A » ──┐    │
 │  (tout outil d'agent)              │(Head-  │  Agent back-end « ticket B » ──┤    │
 │  un dossier de travail par ticket  │ scale) │  (commande configurable)       │    │
 └────────────────────────────────────┘        │  verrous .lock (dossier du ◄───┤    │
                                               │  lanceur, hors miroir)         ▼    │
                                               │                            Miroir   │
                                               └──────────────────┬──────────────────┘
                                                                  │ report manuel
                                                                  ▼
                                                       Serveur back-end déployé
```

- L'outil écoute sur la boucle locale et sur le réseau privé, jamais sur Internet. Les connexions partent toujours du serveur back-end.
- Le lanceur n'exécute que la commande d'agent configurée. Il reçoit du texte, jamais de commande.
- Front et back-end sont deux intervenants du même ticket. Ils échangent par le journal du ticket, avec l'acheminement de l'ADR 0007.

### 2.2 Interface des agents ([ADR 0011](adr/0011-interface-des-agents.md))

```
 Agent (tout outil) ──MCP en HTTP──┐
 Agent ── CLI (client mince) ─HTTP─┤
 Lanceur back-end ──HTTP (privé)───┼──► SERVEUR LOCAL ──► SQLite
 Page ──HTTP + flux d'événements───┘    (seul écrivain)
```

- Le serveur est la seule porte d'entrée vers la base. MCP et CLI offrent les mêmes opérations.
- Un agent se présente avec un nom stable et reçoit un jeton de conversation, joint à chaque appel.
- Serveur absent : erreur claire, le développeur le lance à la main. Rien n'est démarré implicitement.

### 2.3 Usage IA ([ADR 0012](adr/0012-mesure-de-l-usage-ia.md))

- Mesuré par les adaptateurs (hook Claude Code, sortie JSON lue par le lanceur), sinon déclaré par l'agent ; chaque relevé porte sa provenance.
- Rattaché au ticket en charge de la conversation (jeton de l'ADR 0011).
- Jetons + coût estimé (table de prix configurable) ; par ticket, et par jour, semaine et mois, dans le fuseau du développeur ([ADR 0022](adr/0022-regles-du-domaine-confirmees.md)).

### 2.4 Base et sauvegarde ([ADR 0013](adr/0013-base-par-projet-et-sauvegarde.md))

- Une base SQLite par projet, dans `tools/tracker/` du dossier principal, ignoré par git ; un serveur par projet, sur un port configuré.
- Les dossiers de travail n'ont pas de base : leurs agents passent par le serveur du projet.
- Sauvegarde et restauration par commande, à la main.

### 2.5 Paquets ([ADR 0014](adr/0014-decoupage-en-paquets.md))

```
                     ┌────────────┐
                     │  contract  │  formes des échanges (HTTP, MCP, événements)
                     └─────┬──────┘
     ┌──────────┬──────────┼──────────┬───────────────┬──────────┐
     ▼          ▼          ▼          ▼               ▼          ▼
 ┌────────┐ ┌───────┐ ┌───────┐ ┌──────────┐ ┌───────────────┐ ┌─────────┐
 │ server │ │  cli  │ │  web  │ │ launcher │ │adapter-claude │ │ install │
 └───┬────┘ └───────┘ └───────┘ └──────────┘ └───────────────┘ └─────────┘
     ▼
 ┌───────────────────────────────┐
 │ core                          │
 │  usecases ──► domain          │
 │     │   └──► store ──► domain │
 │     └──────► jira  ──► domain │
 └───────────────────────────────┘
```

- Seul `server` importe `core` et ouvre la base ; les autres passent par `contract` et l'API HTTP. Exception : `install` ouvre `core/domain` et `core/store` pour migrer les données V1, serveur arrêté ([ADR 0024](adr/0024-migration-des-donnees-v1.md)).
- Le serveur n'exécute aucune commande : la CLI rapporte les fichiers modifiés pour la détection des chevauchements.

### 2.6 Modèle de données ([ADR 0015](adr/0015-modele-de-donnees.md))

```
 ticket ──┬── situation (état courant : phase, avancement, attente)
          ├── entry (journal immuable, texte intégral)
          ├── assignment (un intervenant par rôle) ── session ── agent
          ├── question ── delivery (remise, prise en compte)
          ├── backendRequest ── execution ── launcher
          ├── worktree, changedFile, fileHold, resourceLock / resourceQueue
          ├── testRun, usage, attachment
          └── deliveryBatch (lot de livraison)
```

- État courant et journal écrits dans la même transaction ; le journal refuse toute modification.

### 2.7 Stack et réponse des agents ([ADR 0016](adr/0016-stack-serveur-et-validation.md), [0017](adr/0017-reponse-structuree-des-agents.md), [0020](adr/0020-suites-du-poc-de-connexion.md))

- Page : Svelte 5 + Vite + TS. Serveur : Hono sur Node, SDK MCP officiel. Validation : Zod dans `contract`.
- Chaque agent termine par une réponse JSON selon un schéma unique. Le lanceur et l'adaptateur Claude Code la lisent, la valident et l'envoient au serveur ; une sortie invalide est gardée brute. MCP et CLI restent le socle.
- Réponse complète pour le back-end (lue par le lanceur) ; pour le front, seulement le message lisible et la question (lus par le hook de fin de tour). Le lecteur ajoute lui-même le ticket, la demande et l'exécution : un JSON valide n'est pas forcément vrai.
- Réponse du développeur : tirée et attendue pour tout agent ; poussée en plus à Claude Code par un channel, envoyé sur la session MCP HTTP de la conversation. L'adaptateur Claude Code est livré comme plugin.
