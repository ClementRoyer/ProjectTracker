# Besoins du développeur

- Statut : **validé par l'utilisateur (2026-10-18)**, besoins et priorités
- Date : 2026-10-18
- Méthode : on part de la journée du développeur, pas de l'outil existant. Aucun mot de solution ici (pas de tableau, de commande, de hook…). Les fonctionnalités en seront déduites ensuite.

Chaque besoin est écrit à la première personne, du point de vue du développeur : « J'ai besoin de… pour… ». Les besoins marqués **(H)** sont des hypothèses de l'IA, à confirmer, corriger ou rayer. Les besoins confirmés perdent leur **(H)**.

## Synthèse des besoins

Validation par l'utilisateur le 2026-10-18. Le détail et ses mots sont dans les sections M1 à M10 ci-dessous.

Priorité : **P** = primaire, obligatoire, c'est le besoin de base ; **S** = secondaire, une aide. L'IA a proposé ces priorités, puis l'utilisateur a tranché les lignes incertaines le 2026-10-18 : B5.4 P, B6.7 S, B8.2 S, B8.3 S, B10.2 et B10.3 P. Il n'a pas contesté les autres lignes. Il a aussi confirmé qu'aucun moment de sa journée ne manque. Les besoins B11 reprennent des fonctionnalités de la V1 que l'utilisateur veut garder (« Ajoute ces points que tu as trouvés de la V1, je les veux », 2026-10-18). Ils sont classés secondaires par défaut.

| ID | J'ai besoin de… | Priorité |
|---|---|---|
| **Savoir ce qui a changé** | | |
| B1.1 | voir les nouveaux tickets qui me sont assignés, révélés par le chargement Jira que je lance | P |
| B1.2 | voir les tickets mis à jour depuis ma dernière visite (statut, retours d'utilisateurs…) | P |
| B1.4 | savoir ce que les agents ont fait et terminé depuis ma dernière visite | P |
| **Savoir où en est chaque ticket** | | |
| B1.3 / B6.4 | voir la situation de chaque ticket : phase, avancement, attente éventuelle | P |
| B3.1 | savoir qui s'occupe de chaque ticket (moi ou tel agent) | P |
| B7.1 | savoir qu'un ticket attend quelqu'un d'extérieur, qui, et depuis quand | P |
| B4.2 | repérer un ticket qui n'avance plus | P |
| B4.1 | voir tout cela quand je viens regarder, sans être interrompu | P (principe) |
| **Ce qui m'attend** | | |
| B1.6 / B5.1 | voir à un seul endroit ce qui attend une réponse de ma part, et depuis quand | P |
| B5.2 | recevoir chaque demande avec historique, dernière étape, contexte, options et recommandation | P |
| B5.3 | suivre la suite après ma réponse : prise en compte, et où en est le ticket | P |
| B5.4 | que ma réponse reparte vers celui qui attend, sans faire le facteur | P |
| **Revoir un ticket** | | |
| B6.1 | retrouver toutes les infos du ticket au même endroit | P |
| B6.2 | retrouver la demande initiale | P |
| B6.3 | connaître l'histoire du ticket avant moi (commentaires Jira, ou ce que je fournis) | P |
| B5.5 | retrouver ce qui a été décidé et pourquoi | P |
| B6.6 / B7.2 | retrouver ce qui a été dit exactement (échanges, décisions), jamais un résumé | P |
| B7.3 | avoir les échanges avec le back-end (agent IA) rattachés au ticket | P |
| **Alimenter le suivi** | | |
| B2.1 | noter un nouveau sujet très vite, sans perdre ma concentration | P |
| B2.2 | qu'un sujet local reste local | P (contrainte) |
| B2.3 | lancer moi-même le chargement depuis Jira | P |
| B2.4 | ne rien recopier d'un ticket Jira, et garder le lien | P |
| B1.7 / B7.4 | rapporter vite un retour reçu par mail ou à l'oral, en le disant à un agent | P |
| B3.2 | que ce que produit mon skill de démarrage (infos Jira, analyse) rejoigne le ticket | P |
| B3.3 | confier un ou plusieurs tickets à un intervenant, sans règle imposée | P |
| **Travailler en parallèle** | | |
| B4.3 | reprendre un ticket arrêté dans une nouvelle conversation, sans perte | P |
| B4.4 | que deux tickets traités en même temps ne se gênent pas (code, environnement) | P |
| **Terminer et livrer** | | |
| B8.1 | voir le résultat des tests du ticket | P |
| B8.4 | être le seul à déclarer un ticket terminé | P |
| B9.1 | savoir quels tickets partent ensemble en qualité | P |
| B9.2 | noter qu'un lot a été livré en qualité | P |
| **Usage de l'IA** | | |
| B10.2 | connaître l'usage de l'IA par ticket, en gros | P |
| B10.3 | connaître l'usage global par jour, semaine, mois | P |
| **Aides** | | |
| B1.5 | qu'on me propose la suite (gain rapide, presque fini, échéance) | S (« bonus ») |
| B9.3 | produire un changelog de livraison, en option | S (« bonus, non primaire ») |
| B6.7 | voir ce qui a changé dans le code pour ce ticket | S |
| B8.2 | noter qu'un test visuel manuel a été fait | S |
| B8.3 | suivre le test utilisateur (fait ou non, retour) | S |
| B0.1 | suivre plusieurs projets (cas rare, environ 5 %) | S (« bonus », voir [understanding.md](understanding.md) §5) |
| **Repris de la V1, à la demande de l'utilisateur** | | |
| B11.1 | être notifié (cloche, titre de l'onglet, navigateur) | S |
| B11.2 | choisir le thème de couleur et la langue de l'interface | S |
| B11.3 | générer des fichiers à partir de modèles (exports) | S |
| B11.4 | voir les écarts entre le statut Jira et la situation locale | S |
| B11.5 | joindre des captures d'écran et des pièces jointes à un ticket | S |
| B11.6 | voir les dépôts, les lots et les documents du projet | S |
| B11.7 | demander « où en est-on ? » à l'intervenant d'un ticket | S |
| B11.8 | que les messages du back-end soient capturés automatiquement, et qu'il reçoive les consignes d'échange | S |
| B11.9 | coordonner explicitement les intervenants : réservation d'un ticket, fichiers tenus, verrou d'une ressource partagée, garde contre les écritures interdites | S |

## Qui je suis

Je suis développeur sur un projet, rarement plusieurs. J'ai plusieurs tickets ouverts en même temps. Certains, je les traite moi-même ; d'autres sont confiés à des agents d'IA, un agent pouvant en porter un ou plusieurs. Les tickets viennent de Jira (bug en qualité ou en prod, demande de fonctionnalité) ou de moi (bug trouvé en testant, idée, amélioration invisible).

---

## M1. Je commence ma journée, ou je reviens après une coupure

**Situation** : j'ai plusieurs tickets en cours. Je ne me souviens plus précisément de l'état de chacun.

**Les mots de l'utilisateur (2026-10-18)** :
> « Je cherche à savoir si des nouveaux tickets sont apparus, si certains tickets ont eu des mises à jour (de statut, de retours utilisateurs, etc.), puis où en sont les tickets en cours, est-ce que des agents ont travaillé et fini des tâches, si tout est bon, qu'est-ce qu'il y a à faire ensuite. »

Dans l'ordre où il les cherche :
- B1.1 J'ai besoin de savoir **quels nouveaux tickets sont apparus**.
- B1.2 J'ai besoin de savoir **quels tickets ont été mis à jour depuis ma dernière visite** : changement de statut, retours d'utilisateurs, etc.
- B1.3 J'ai besoin de voir **où en sont les tickets en cours**.
- B1.4 J'ai besoin de savoir **ce que les agents ont fait et terminé** depuis ma dernière visite.
- B1.5 J'ai besoin de savoir **ce qu'il y a à faire ensuite**.
- B1.6 J'ai besoin de savoir **lesquels m'attendent**, et depuis quand.

**Ce que ça nous apprend** : les changements qui comptent ne viennent pas seulement des agents. Ils viennent aussi de **l'extérieur** : un nouveau ticket, un statut changé, un retour d'utilisateur. Le point de départ de la journée, c'est **« qu'est-ce qui a changé ? »**, puis seulement **« où en est-on ? »**, et enfin **« que fait-on ? »**.

**Précisions de l'utilisateur (2026-10-18)** :

| Question | Réponse | Besoin qui en découle |
|---|---|---|
| Quels nouveaux tickets te concernent ? | « Un ticket assigné à moi, sur le projet en question. » | B1.1 précisé : les nouveaux tickets **qui me sont assignés** sur le projet. |
| Où arrivent les retours d'utilisateurs ? | « Sur Jira (peut être récupéré automatiquement), par mail ou oral, et là c'est à moi de l'indiquer. » | B1.7 J'ai besoin d'**ajouter moi-même, vite, un retour reçu par mail ou à l'oral** sur un ticket. |
| « Ce qu'il y a à faire ensuite » : décidé ou proposé ? | « Ça pourrait être proposé (quick win, presque fini, deadline, etc.) (bonus ?) » | B1.5 précisé : une **proposition** de la suite, selon des critères comme gain rapide, presque fini ou échéance. **Candidat secondaire.** |

## M2. Un nouveau sujet arrive

**Situation** : un bug remonte de la qualité, une demande arrive dans Jira, ou je trouve moi-même un problème en testant autre chose.

**Réponses de l'utilisateur (2026-10-18)** :

| Question | Réponse |
|---|---|
| Un sujet trouvé par toi : il va dans Jira ensuite, ou il reste local ? | « Il doit rester en local. » |
| Les tickets Jira : qu'ils apparaissent tout seuls, ou les ajouter toi-même ? | « Je préfère lancer moi-même les chargements de Jira. » |

- B2.1 J'ai besoin de **noter le sujet très vite**, sans perdre ma concentration sur ce que je fais.
- B2.2 Un sujet que je trouve moi-même **reste local** : il n'est jamais envoyé vers Jira.
- B2.3 **C'est moi qui lance le chargement depuis Jira**, quand je le décide. Rien n'arrive tout seul.
- B2.4 Pour un ticket chargé depuis Jira, j'ai besoin de **ne pas recopier** ce qui y est déjà (titre, description, commentaires) et de garder le lien vers Jira.
- ~~B2.5 Décider plus tard quand et par qui un nouveau sujet sera traité~~ : **rayé** par l'utilisateur (2026-10-18).

**Ce que ça nous apprend** : la relation avec Jira est **en lecture, et à ma demande**. Les « nouveaux tickets » et les « mises à jour » du matin (B1.1, B1.2) sont ceux révélés par **le chargement que je lance**.

## M3. Je lance le travail sur un ticket

**Situation** : je décide de traiter un ticket, moi-même ou en le confiant à un agent.

**Réponses de l'utilisateur (2026-10-18)** :

| Question | Réponse |
|---|---|
| Comment confies-tu un ticket à un agent aujourd'hui ? | « J'utilise un skill pour aller chercher les infos Jira, scanner la codebase et commencer l'analyse. » |
| Qu'est-ce qui est pénible ou répétitif ? | « NA » (rien de particulier) |
| Comment décides-tu qui fait quoi, et les regroupements ? | « Il n'y a pas de règle. » |

- B3.1 J'ai besoin de **savoir qui s'occupe de chaque ticket** (moi ou tel agent).
- B3.2 Le démarrage d'un ticket est **déjà outillé** : un skill récupère les infos Jira, parcourt le code et lance l'analyse. J'ai besoin que **ce qui en sort (infos du ticket, analyse) rejoigne le suivi du ticket**, sans le refaire.
- B3.3 Je confie un ou plusieurs tickets à un intervenant **sans règle fixe** : le suivi doit l'accepter, sans rien imposer.

**Ce que ça nous apprend** : le lancement n'est pas un point de douleur. Le suivi ne doit **pas remplacer** cet outil de démarrage, mais **récupérer ce qu'il produit**. Les choix d'attribution restent libres.

## M4. Plusieurs tickets avancent en même temps

**Situation** : des agents travaillent sur plusieurs tickets pendant que je fais autre chose, parfois mon propre ticket.

**Réponses de l'utilisateur (2026-10-18)** :

| Question | Réponse |
|---|---|
| Quand veux-tu savoir ce qui se passe ? | « Quand je viens regarder. » |
| Un ticket qui n'avance plus : ça arrive, comment le vois-tu ? | « Oui, je cherche la conversation, ou recrée une nouvelle. » |
| Deux tickets qui se gênent : déjà arrivé ? | « Oui, très très souvent. Pour le moment, je ne fais pas trop plusieurs tickets en simultané (même moment la modif du code), donc je n'ai pas le problème, mais on l'aura avec le nouvel outil. » |

- B4.1 J'ai besoin de savoir **ce qui se passe sur chaque ticket quand je viens regarder**. Je n'ai pas besoin d'être interrompu.
- B4.2 J'ai besoin de **repérer un ticket qui n'avance plus**.
- B4.3 J'ai besoin de **reprendre un ticket arrêté dans une nouvelle conversation, sans perte** : le nouvel intervenant doit repartir de tout ce qui a été fait et dit.
- B4.4 J'ai besoin que **deux tickets traités en même temps ne se gênent pas**, sur le même code ou sur un environnement partagé.

**Ce que ça nous apprend** :
- L'information est **consultée, pas poussée** : le développeur vient voir quand il le décide.
- Quand un ticket s'arrête, la reprise passe aujourd'hui par **la recherche de l'ancienne conversation ou par une nouvelle conversation**. Le ticket doit donc porter assez d'information pour être repris par n'importe qui, à n'importe quel moment.
- **Les conflits sont fréquents** dès que l'on modifie du code en parallèle. Aujourd'hui, le développeur les évite en **ne parallélisant pas** les modifications. Or traiter plusieurs tickets en même temps est justement la promesse du nouvel outil : sans réponse aux conflits, cette promesse ne tient pas.

## M5. On a besoin de moi

**Situation** : celui qui traite un ticket a besoin d'une décision ou d'une information de ma part.

**Ce que fait l'utilisateur aujourd'hui (2026-10-18)** :

| Question | Réponse |
|---|---|
| Où arrivent ces demandes, comment t'en rends-tu compte ? | « Je check juste les dernières conversations que j'ai, et c'est surtout dans ma mémoire. » |
| Qu'est-ce qu'il te faut pour décider vite ? | « L'historique, la dernière étape utilisée, et le contexte, les options + recommandations. » |
| Qu'est-ce qui est pénible après avoir répondu ? | « Le suivi, savoir où ça en est. » |

- B5.1 J'ai besoin de **voir à un seul endroit tout ce qui attend une réponse de ma part**, sans dépendre de ma mémoire ni rouvrir chaque conversation.
- B5.2 Pour décider vite, j'ai besoin que la demande vienne avec **l'historique du ticket, la dernière étape, le contexte, les options et une recommandation**.
- B5.3 Après avoir répondu, j'ai besoin de **suivre la suite** : que ma réponse a été prise en compte, et où en est le ticket depuis.
- B5.4 J'ai besoin que **ma réponse reparte vers celui qui attend** sans que je fasse le facteur.
- B5.5 J'ai besoin de **retrouver plus tard ce que j'ai décidé** et pourquoi.

**Ce que ça nous apprend** : aujourd'hui, **rien ne garantit qu'une demande en attente ne soit pas oubliée**. Tout repose sur la mémoire du développeur. Et répondre ne clôt rien : le vrai souci, c'est le **suivi après la réponse**.

## M6. Je reviens sur un ticket

**Situation** : je reprends un ticket après plusieurs jours, ou après avoir travaillé sur d'autres. C'est le cœur de la difficulté exprimée par l'utilisateur.

**Les mots de l'utilisateur (2026-10-18)** :
> « Le contexte principalement. Quelle est la demande initiale, puis quelle est la situation quand j'ai pris en main le ticket (ex. : une demande de dev a été prise en charge par un autre dev, c'est resté en test un temps, puis finalement des corrections sont nécessaires), et quelle est la situation aujourd'hui. »

- B6.1 J'ai besoin de **revoir toutes les informations du ticket** au même endroit.
- B6.2 J'ai besoin de retrouver **la demande initiale**.
- B6.3 J'ai besoin de connaître **la situation quand j'ai pris le ticket en main** : son histoire avant moi (qui l'a eu, par où il est passé, pourquoi il revient).
- B6.4 J'ai besoin de connaître **la situation aujourd'hui**.
- B6.5 *Fusionné avec B5.5* (même besoin : retrouver ce qui a été décidé et pourquoi, sans relire les conversations).
- B6.6 J'ai besoin de retrouver **ce qui a été dit exactement**, avec un partenaire comme pour une décision, et pas un résumé.
- B6.7 J'ai besoin de voir **ce qui a changé dans le code** pour ce ticket.

**Ce que ça nous apprend** : le contexte se lit en **trois temps** : la demande, l'histoire jusqu'à ma prise en main, la situation actuelle. **Un ticket a une vie avant moi** : un autre développeur, un passage en test, un retour en correction. Le suivi ne peut pas commencer au moment où je prends le ticket.

**Précisions de l'utilisateur (2026-10-18)** :

| Question | Réponse | Besoin qui en découle |
|---|---|---|
| Où se trouve l'histoire avant toi ? | « Jira commentaires, ou alors c'est à moi de le donner. » | B6.3 précisé : l'histoire vient **des commentaires Jira**, ou c'est **moi qui la fournis**. |
| « La situation aujourd'hui », c'est quoi ? | « C'est dire si le développement a démarré, si oui où il en est, si l'analyse est faite ou en cours, si c'est en attente d'une réponse utilisateur ou back-end par ex. » | B6.4 précisé, voir ci-dessous. |

**La situation d'un ticket**, selon l'utilisateur, se dit en trois points :
1. **La phase** : analyse, développement, test, livraison en qualité, validation en qualité (cycle complet donné en M8).
2. **L'avancement dans cette phase** : pas démarrée, en cours (où on en est), faite.
3. **L'attente éventuelle** : une réponse d'un utilisateur, du back-end, etc.

## M7. J'attends quelqu'un d'autre

**Situation** : le ticket dépend d'une autre équipe ou d'un partenaire (par exemple le back-end) ou d'un environnement.

**Réponses de l'utilisateur (2026-10-18)** :

| Question | Réponse |
|---|---|
| Qui sont les partenaires ? | « Le back-end est un agent IA joignable via un channel exposé (la solution peut changer si tu me recommandes une autre solution). La qualité, c'est moi qui déploie en qual, teste avec les users (ou non) et valide manuellement, pareil pour les utilisateurs. » |
| Par quel canal ? | « Jira, c'est via l'API, mais je pense que le soft ne doit pas connaître l'URL du Jira ni le token, mais configurable via un fichier. Mail, messagerie et oral, c'est moi qui te rapporterai cela. » |
| Texte exact ou résumé ? | « Historique exact. » |

- B7.1 J'ai besoin de savoir **qu'un ticket attend quelqu'un d'extérieur**, qui, et depuis quand.
- B7.2 J'ai besoin de **garder l'historique exact des échanges**, rattaché au ticket. Un résumé ne suffit pas.
- B7.3 J'ai besoin que **les échanges avec le back-end**, qui est un agent d'IA, soient rattachés au ticket concerné.
- B7.4 J'ai besoin de **rapporter moi-même** un échange reçu par mail, par messagerie ou à l'oral, en le disant simplement à un agent qui le consigne.

**Les acteurs autour d'un ticket** :

| Acteur | Nature | Comment l'information arrive |
|---|---|---|
| Moi | Humain | Je travaille, je rapporte, je décide |
| Agents qui traitent les tickets | IA | Ils alimentent le suivi |
| Back-end | Agent d'IA, joint par un canal exposé | Échanges à conserver mot pour mot |
| Qualité | Moi : je déploie, je teste, je valide | C'est moi qui l'indique |
| Utilisateurs | Humains, en recette ou non | Jira (automatique) ou moi (mail, oral) |
| Jira | Outil externe | Par son API, configurée hors du logiciel |

**Ce que ça nous apprend** :
- La **qualité n'est pas un tiers** : c'est le développeur lui-même. Les étapes « livraison en qualité » et « validation en qualité » sont donc ses propres actions à consigner.
- **Le canal vers le back-end n'est pas figé** : l'utilisateur est ouvert à une recommandation (question technique, à traiter dans l'architecture).
- **La saisie manuelle passe par la conversation** : le développeur rapporte à un agent, qui consigne.

## M8. Je vérifie qu'un ticket est vraiment fini

**Situation** : on me dit que le ticket est terminé.

**Réponses de l'utilisateur (2026-10-18)** :

| Question | Réponse |
|---|---|
| Qu'est-ce qui te fait dire qu'un ticket est terminé ? | « Test OK + test visuel manuel si besoin, + test utilisateur. » |
| Qui décide qu'il est fini ? | « Moi. » |
| Quelles phases comptent après le développement ? | « Test, livraison en qualité, validation en qualité. » |

- B8.1 J'ai besoin de **voir le résultat des tests** du ticket.
- B8.2 J'ai besoin de **noter qu'un test visuel manuel a été fait**, quand le ticket en demande un.
- B8.3 J'ai besoin de **suivre le test utilisateur** : fait ou non, et son retour.
- B8.4 **C'est moi qui déclare un ticket terminé.** Aucun intervenant ne le fait à ma place.

**Le cycle de vie d'un ticket**, complété par l'utilisateur :

```
Analyse → Développement → Test → Livraison en qualité → Validation en qualité
```

Le glossaire ajoute en tête la phase **À faire**, pour un ticket pas encore commencé (décision de l'utilisateur, 2026-10-18).

Le suivi s'arrête à la validation en qualité ; la mise en production n'est pas citée. Dans chaque phase, la situation se dit toujours par son **avancement** et une **attente** éventuelle (voir M6).

## M9. Je livre

**Situation** : un ou plusieurs tickets partent en qualité ou en production.

**Réponses de l'utilisateur (2026-10-18)** :

| Question | Réponse |
|---|---|
| Comment se passe une livraison ? | « Souvent un lot de tickets. Produire un changelog peut parfois être utile. Rendre cela configurable via une option dans le dashboard peut-être utile (bonus, non primaire). » |
| Qu'est-ce qui est pénible ? | « NA » (rien de particulier) |

- B9.1 J'ai besoin de savoir **quels tickets partent ensemble** dans une livraison en qualité.
- B9.2 J'ai besoin de **noter qu'un lot a été livré en qualité**, pour que chaque ticket passe à l'étape suivante.
- B9.3 J'aimerais pouvoir **produire un changelog** de la livraison, en option. **Secondaire (bonus), selon l'utilisateur.**

## M10. Je prends du recul

**Situation** : en fin de semaine, ou quand on me demande où en est le projet.

**Réponses de l'utilisateur (2026-10-18)** :

| Question | Réponse |
|---|---|
| Te demande-t-on où en est le projet ? | « Non. » |
| As-tu besoin de connaître le coût de l'IA ? | « Oui, j'ai besoin de savoir en gros un usage par ticket, et niveau dashboard un usage journalier, semaine et mensuel. » |

- ~~B10.1 Dire où en est le projet à quelqu'un~~ : **rayé**, personne ne le demande.
- B10.2 J'ai besoin de connaître **l'usage de l'IA, approximatif, par ticket**.
- B10.3 J'ai besoin de connaître **l'usage global par jour, par semaine et par mois**.

## Contraintes exprimées

- **C1. Le logiciel ne contient ni l'URL ni le jeton de Jira.** Ils sont fournis par un fichier de configuration (2026-10-18).
- **C2. Jira en lecture seule, à la demande.** Le chargement est lancé par le développeur ; rien n'est écrit dans Jira, et les tickets locaux restent locaux (2026-10-18).

## Constats transverses

Ce qui revient d'un moment à l'autre :

- **T1. Deux sources d'information.** Une partie arrive **automatiquement** : Jira, le travail des agents. L'autre ne peut venir que **de moi** : un retour reçu par mail ou à l'oral, l'histoire d'un ticket qui n'est écrite nulle part. Les deux doivent aboutir au même endroit, et ma saisie doit être rapide.
- **T2. Les changements viennent aussi de l'extérieur** : un nouveau ticket assigné, un changement de statut, un retour d'utilisateur. Le travail des agents n'est qu'une partie de ce qui bouge.
- **T3. Un ticket a une vie avant moi et en dehors de moi.** Le suivi doit pouvoir porter cette histoire.
- **T4. Primaire et secondaire.** L'utilisateur commence à classer. Sont des « bonus » : proposer la suite (B1.5) et le changelog optionnel (B9.3).
- **T5. Le développeur est à la fois intervenant, qualité et décideur.** Beaucoup d'étapes du ticket sont ses propres actions, à consigner aussi simplement que celles des agents.

## Ce qui manque

Rien : l'utilisateur confirme qu'aucun moment de sa journée ne manque (2026-10-18).
