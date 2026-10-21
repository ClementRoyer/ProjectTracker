# 0027. Authentification du développeur auprès du serveur

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (question du 2026-10-19, au début de l'étape 9c)
- Liens : [ADR 0011](0011-interface-des-agents.md) (jetons des agents), [0010](0010-back-end-intervenant-du-ticket.md) (jeton du lanceur), [0021](0021-suites-du-poc-reseau-et-lanceur.md) (mode sans TUN), [0026](0026-operations-cli-configuration-jira.md)

## Contexte

Les agents ont un jeton de conversation (ADR 0011) et le lanceur a le sien (ADR 0010). Il faut reconnaître le développeur, seul autorisé à clore un ticket, à répondre aux questions ou à noter une livraison. En mode sans TUN (ADR 0021), les connexions du réseau privé arrivent sur la boucle locale : l'adresse d'origine ne suffit pas.

## Options étudiées

| Option | Avantages | Inconvénients |
|---|---|---|
| **Jeton dans un fichier local**, renouvelé à chaque démarrage (recommandé) | Rien à configurer ; rien ne traîne d'un démarrage à l'autre | Il faut lire le fichier : la CLI le fait seule |
| Jeton fixe dans une variable d'environnement | Stable | À gérer, et à ne jamais commiter |
| Pas de jeton développeur | Le plus simple | Un appareil du réseau privé pourrait agir au nom du développeur |

## Décision

**Jeton dans un fichier local.**

- Au démarrage, le serveur tire un jeton aléatoire et l'écrit dans `developer.token`, à côté de la base, lisible par le seul utilisateur (droits 600) et ignoré par git. Un nouveau jeton remplace l'ancien à chaque démarrage.
- La page reçoit le jeton dans le HTML qu'elle charge ; la CLI du développeur le lit dans le fichier.
- Toute requête porte un jeton (`Authorization: Bearer …`) : développeur, conversation d'agent ou lanceur. Sans jeton valide, seule la présentation d'un agent (`introduce`) est acceptée, pour qu'une nouvelle conversation obtienne le sien.
- Le serveur refuse aussi une requête dont l'en-tête `Host` n'est pas une de ses adresses d'écoute (protection contre le « DNS rebinding »).

## Conséquences

- Les opérations réservées au développeur (clôture, réponses, livraisons) ne sont accessibles qu'avec ce jeton.
- `introduce` reste ouvert : sur le réseau privé, la règle d'accès Headscale (ADR 0021) limite qui peut joindre le serveur.
- Un agent qui tourne sur la machine du développeur pourrait lire le fichier : le jeton protège du réseau, pas des programmes du développeur lui-même.
