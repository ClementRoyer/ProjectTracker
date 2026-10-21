# 0021. Suites du POC, partie B : réseau sans TUN, relance des demandes bloquées, garde-fou en parallèle

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (« Mode sans TUN. Oui relancer automatiquement si lock quand lock fini. Avoir une priorité » ; puis choix « File d'attente d'un fichier » et « Signaler sur tous »)
- Liens : [compte rendu du POC B](../analysis/2026-10-19-poc-connexion-b/README.md) ; complète l'[ADR 0010](0010-back-end-intervenant-du-ticket.md)

## Contexte

Le POC B a confirmé le lanceur et les verrous (R6), mais trois points de l'ADR 0010 se sont révélés incomplets :

1. **Réseau.** Le poste du développeur est un conteneur sans `/dev/net/tun`, et TUN ne peut pas y être activé. Tailscale tourne alors en mode userspace :
   - il n'y a pas d'interface réseau privée, donc l'outil ne peut pas écouter « sur l'interface du réseau privé » comme le prévoit l'ADR 0010 ;
   - les connexions venues du réseau privé sont livrées sur la boucle locale ;
   - un programme local ne joint le réseau privé que par le proxy de `tailscaled`.
2. **Fichier tenu.** Un agent back-end qui trouve son fichier tenu par un autre ticket s'arrête en `blocked`, et rien ne relance la demande.
3. **Garde-fou.** Quand plusieurs exécutions tournent en même temps dans le miroir, une modification non déclarée ne peut pas être attribuée à l'une d'elles.

## Options étudiées

| Point | Options | Choix |
|---|---|---|
| 1. Réseau sans TUN | Activer TUN (impossible ici) ; mode userspace avec une règle d'accès Headscale | Mode userspace |
| 2. Fichier tenu | Relance manuelle ; relance automatique à la libération | Relance automatique |
| 2b. Plusieurs demandes attendent le même fichier | Ordre d'arrivée ; priorité | Priorité, puis ordre d'arrivée |
| 3. Garde-fou en parallèle | Signaler sur tous les tickets en cours ; une exécution à la fois ; imputer par priorité | Signaler sur tous |

## Décision

### 1. Mode sans TUN accepté

- Quand TUN n'est pas disponible, Tailscale tourne en **mode userspace** sur la machine concernée.
- L'outil écoute **sur la boucle locale seulement** ; Tailscale y livre les connexions du réseau privé.
- **Condition : une règle d'accès Headscale (ACL).** Seul le serveur back-end (et un appareil du développeur, s'il le veut) peut joindre le poste du développeur, **et seulement sur le port de l'outil**. Sans elle, tous les services locaux du poste seraient exposés au réseau privé.
- Le lanceur sait passer par un **proxy HTTP** (celui de `tailscaled`), réglé dans sa configuration.
- L'outil n'est toujours **jamais exposé sur Internet**, et les connexions partent toujours du serveur back-end.

### 2. Relance automatique des demandes bloquées par un fichier tenu

- Quand l'agent signale qu'un fichier est tenu, la demande passe en **« attente : fichier tenu par <ticket> »**. Elle n'est pas en échec.
- **À la libération du fichier, le lanceur relance la demande** sans intervention : il reprend la conversation de l'agent si l'outil d'agent sait le faire, sinon il démarre un agent neuf.
- **Plusieurs demandes attendent le même fichier** : la demande dont le **ticket a la plus haute priorité** passe en premier ; à priorité égale, la plus ancienne.
- La **priorité du ticket** est une notion nouvelle, réglée par le développeur.

### 3. Garde-fou avec plusieurs exécutions en parallèle

- Une modification non déclarée constatée pendant que plusieurs exécutions tournent est **signalée sur chacun des tickets en cours**, avec la mention **« auteur incertain »**. Le développeur tranche.
- Avec une seule exécution en cours, le signalement reste celui de l'ADR 0010.

## Conséquences

- Le glossaire gagne la **priorité** (`priority`) du ticket, et le modèle de données (ADR 0015) un champ `priority` sur `ticket`.
- Détails laissés à l'étape du lanceur, à soumettre au développeur à ce moment : les niveaux de priorité, et la valeur par défaut.
- L'installation décrira la règle d'accès Headscale à poser, et la configuration du proxy quand TUN manque.
- Restent à vérifier sur le vrai serveur back-end : le passage à travers le réseau d'entreprise (R5), le lanceur entre deux machines (R6) et le coût d'un worktree (R7).
