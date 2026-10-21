# 0020. Suites du POC de connexion : push, JSON des agents front, champs fixés par le lanceur

- Statut : Acceptée
- Date : 2026-10-19
- Décideur : l'utilisateur (« ok pour les 3 recommandations », réponse aux trois questions du compte rendu)
- Liens : [compte rendu du POC A](../analysis/2026-10-19-poc-connexion/README.md) ; complète l'[ADR 0007](0007-acheminement-des-reponses.md) et l'[ADR 0017](0017-reponse-structuree-des-agents.md)

## Contexte

Le POC A a confirmé les connexions locales (R1 à R4), sans contredire d'ADR. Trois observations demandaient un choix :

1. Le **push par channel** marche, et même directement par le serveur HTTP, sans passerelle stdio, ce que la documentation ne prévoit pas. Il reste expérimental, propre à Claude Code. En production, il exige `--channels plugin:…`, réservé aux plugins approuvés.
2. Le **JSON de fin de tour des agents front** double leurs appels MCP : l'avancement est enregistré deux fois. Il remplace aussi la réponse en prose que le développeur lit dans sa conversation.
3. Avec `--json-schema`, `claude -p` rend toujours un JSON valide, **même faux** : à la consigne « réponds seulement BONJOUR », il a rendu `ticketId: "BONJOUR"`. Le schéma garantit la forme, pas la vérité.

## Options étudiées

| Question | Options | Recommandation de l'IA |
|---|---|---|
| 1. Push | Le garder en plus de la réponse tirée et de l'attente ; ou s'en passer | Le garder en plus |
| 2. JSON front | (a) tel quel ; (b) gardé, sans les doublons ; (c) pour le front, seulement le message lisible et la question | (c) |
| 3. Champs connus du lanceur | Les laisser dans le schéma ; ou les retirer | Les retirer |

## Décision

Les trois recommandations sont retenues.

1. **Le push reste un accélérateur pour Claude Code**, comme l'ADR 0007 le prévoyait. La réponse tirée et l'attente restent le socle, car elles marchent avec tout agent.
   - Le serveur envoie la notification `notifications/claude/channel` sur la session MCP HTTP de la conversation, **sans passerelle stdio**.
   - Le serveur retient, pour chaque jeton de conversation, la dernière session MCP qui l'a utilisé : une reprise ouvre une nouvelle session.
   - En production, l'adaptateur Claude Code est livré comme plugin, pour pouvoir activer le channel sans l'option de développement.
   - Ce passage HTTP n'est pas documenté. Si une version de Claude Code le casse, on revient à la passerelle stdio, déjà essayée dans le POC.
2. **Deux formes de réponse, issues du même schéma** dans `contract` :
   - **back-end (lu par le lanceur)** : la réponse complète de l'ADR 0017, c'est-à-dire statut, message, question, avancement et fichiers modifiés ;
   - **front (lu par le hook de fin de tour)** : seulement le **message lisible** et la **question** éventuelle. L'avancement et les fichiers passent par les outils MCP ou la CLI, que l'agent front utilise déjà.
3. **Le lanceur fixe lui-même ce qu'il sait**, comme le ticket, la demande back-end et l'exécution. Ces champs **ne figurent pas** dans le schéma demandé à l'agent. Ils sont ajoutés par le lecteur (lanceur ou adaptateur) avant l'envoi au serveur. De même, l'adaptateur rattache la réponse front au ticket d'après la conversation dont elle vient, pas d'après le texte de l'agent (le lien entre la conversation Claude Code et le jeton reste à établir à l'étape 9).

## Conséquences

- L'ADR 0017 s'applique avec ces précisions : un schéma de base, une variante réduite pour le front, et aucun champ que le lecteur connaît déjà.
- La conversation du développeur avec un agent front reste lisible : seule une courte fin structurée s'ajoute.
- Le plugin Claude Code devient la forme de livraison de `adapter-claude` (étape 9). Son installation reste à décrire.
