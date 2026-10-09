# `tsp`, le point d'entrée unique du dépôt

| Champ       | Valeur |
|-------------|--------|
| id          | `004`  |
| module      | cli    |
| type        | feat   |
| bloquée par | —      |

## Problem Statement

Piloter le dépôt demande de retenir quatre outils (`mise`, `pnpm`, `git`, `gh`),
un tableau Notion et quatre trackers de specs.

- Les scripts diffèrent d'une app à l'autre. Le simulateur a `dev:front` et
  `dev:server`. Le glossaire a `watch`. `data-analyzer` n'a ni `build` ni
  `start`.
- Le travail en cours est éparpillé : PR, branches, `docs/tasks`, specs, tickets
  Notion. Aucune commande ne le rassemble.
- Les règles, les skills et les features se lisent fichier par fichier.
- Un agent n'a rien à appeler : il relit `AGENTS.md` et devine les commandes.

Pour le développeur, c'est de la charge mentale. Pour un agent, ce sont des
gestes qu'il ne peut pas automatiser.

## Solution

Une CLI, `tsp` (pour « transport sanitaire »), dans `apps/cli`. Elle est le seul
point d'entrée du dépôt. Le premier geste sur une machine neuve est
`./tsp setup`. Tout le reste passe par `tsp`.

Par app, sous la forme `tsp <action> [app]` :

| Commande | Ce qu'elle fait |
|---|---|
| `tsp install [app]` | installe les dépendances |
| `tsp build [app]` | construit l'app |
| `tsp start [app]` | lance la version de production |
| `tsp test [app]` | lance les tests |
| `tsp dev [app]` | lance le serveur de développement local |
| `tsp verifier [app]` | passe la porte : lint, typecheck, knip, tests, build |
| `tsp features [app]` | liste les features de l'app |

Transverses :

| Commande | Ce qu'elle fait |
|---|---|
| `tsp setup` | prépare la machine : `mise`, toolchain, dépendances, hooks, `.env`, lien vers `tsp` |
| `tsp doctor` | dit ce qui manque : toolchain, hooks, `.env`, `gh`, jeton Notion |
| `tsp apps` | liste les apps, leur version, leurs actions |
| `tsp rules` | liste les recueils de règles |
| `tsp rules <recueil>` | liste les règles d'un recueil, ex. `tsp rules git` |
| `tsp rules <id>` | affiche une règle entière, ex. `tsp rules GIT-009` |
| `tsp skills` | liste les skills du dépôt |
| `tsp skills <skill>` | affiche un skill |
| `tsp docs [app]` | liste les ADR et les connaissances métier |
| `tsp wip` | montre le travail en cours |
| `tsp next` | montre le travail à prendre |
| `tsp spec new <module> <type> <titre>` | crée une spec avec le prochain id |
| `tsp spec move <id> <état>` | change une spec d'état |
| `tsp spec sync [id]` | crée ou met à jour le ticket Notion d'une spec |
| `tsp branch <type>/<sujet>` | tire une branche de `staging` |
| `tsp pr` | pousse la branche et ouvre la PR vers `staging` |
| `tsp pr status` | montre l'état de la PR courante et de sa CI |

## User Stories

Installer et diagnostiquer :

1. En tant que développeur sur une machine neuve, je veux lancer `./tsp setup`
   et rien d'autre, afin d'avoir un dépôt prêt sans lire de documentation.
2. En tant que développeur sans `mise`, je veux que `setup` propose de
   l'installer, afin de ne pas chercher la commande officielle.
3. En tant qu'agent, je veux passer `--yes` à `setup`, afin qu'aucune question
   ne bloque une exécution sans terminal.
4. En tant que développeur, je veux relancer `setup` sans risque, afin de
   réparer une installation partielle.
5. En tant que développeur, je veux que `setup` crée les `.env` manquants depuis
   leurs gabarits, afin de voir d'un coup quelles valeurs renseigner.
6. En tant que développeur, je veux taper `tsp` depuis n'importe quel dossier,
   afin de ne pas revenir à la racine.
7. En tant qu'agent dans un worktree, je veux que `tsp` exécute la CLI de ce
   worktree, afin de tester la version que je modifie.
8. En tant que développeur, je veux que `tsp doctor` liste ce qui manque et la
   commande qui le répare, afin de corriger sans chercher.

Agir sur une app :

9. En tant que développeur, je veux la même commande `dev` pour chaque app,
   afin de ne pas retenir `dev:front`, `dev:server` et `watch`.
10. En tant que développeur, je veux lancer `tsp dev simulateur`, afin d'avoir le
    front et le serveur d'un seul geste.
11. En tant que développeur, je veux des alias courts (`simulateur`, `data`,
    `glossaire`), afin de taper moins.
12. En tant que développeur, je veux qu'une action sans app passe sur toutes les
    apps qui la portent, une à la fois, afin de garder une sortie lisible.
13. En tant que développeur, je veux un message clair quand une app ne porte pas
    l'action demandée, afin de ne pas croire à une panne.
14. En tant qu'agent, je veux un code de sortie non nul dans ce cas, afin de ne
    pas conclure à un succès.
15. En tant que développeur, je veux `tsp verifier [app]`, afin de passer la
    porte avant de dire que c'est fait.
16. En tant que développeur, je veux que `tsp apps` dise quelles actions chaque
    app porte, afin de savoir ce que je peux lancer.
17. En tant que nouvel arrivant, je veux `tsp features simulateur`, afin de
    comprendre ce que fait l'app sans lire son code.
18. En tant qu'agent, je veux `tsp features --json`, afin de vérifier qu'une
    demande ne recrée pas une feature existante.

Lire les règles, les skills et la documentation :

19. En tant que développeur, je veux `tsp rules git`, afin de relire les règles
    de commit avant de commiter.
20. En tant que relecteur, je veux `tsp rules QUAL-006`, afin de citer le texte
    exact d'une règle en revue.
21. En tant qu'agent, je veux `tsp rules --json`, afin de charger les règles
    sans analyser du Markdown.
22. En tant que développeur, je veux `tsp skills`, afin de savoir quels gestes
    ont déjà leur mode d'emploi.
23. En tant qu'agent, je veux `tsp skills <skill>`, afin de lire un mode
    d'emploi sans connaître son chemin.
24. En tant que développeur, je veux `tsp docs [app]`, afin de trouver un ADR ou
    une connaissance métier sans parcourir l'arborescence.

Voir le travail :

25. En tant que développeur qui reprend après une pause, je veux `tsp wip`,
    afin de voir tout ce qui est commencé en un écran.
26. En tant que développeur, je veux y voir les PR ouvertes, afin de savoir ce
    qui attend une revue.
27. En tant que développeur, je veux y voir les branches sans PR non fusionnées
    dans `staging`, afin de retrouver un travail oublié.
28. En tant que développeur, je veux y voir les tâches et les specs en cours, de
    la racine et de chaque app, afin de ne pas ouvrir quatre trackers.
29. En tant que développeur, je veux y voir les tickets Notion en `Doing Dev` et
    `Reviewing dev`, afin de ne pas ouvrir Notion.
30. En tant que développeur, je veux `tsp next`, afin de choisir quoi prendre
    ensuite.
31. En tant que développeur, je veux qu'une spec et son ticket n'apparaissent
    qu'une fois, afin de ne pas compter deux fois le même travail.
32. En tant que développeur sans jeton Notion, je veux que `wip` et `next`
    affichent le reste, afin de ne pas être bloqué.
33. En tant qu'agent, je veux `tsp wip --json` et `tsp next --json`, afin de
    choisir une tâche sans intervention.

Tenir les specs :

34. En tant que développeur, je veux `tsp spec new`, afin de ne pas chercher le
    prochain id ni recopier le gabarit.
35. En tant que développeur, je veux qu'un id ne soit jamais réemployé, afin
    qu'un vieux commit ne pointe pas sur une autre spec.
36. En tant que développeur, je veux `tsp spec move`, afin de changer d'état
    sans manipuler des dossiers à espaces.
37. En tant que développeur, je veux que passer une spec en `done` la retire du
    champ « bloquée par » des autres, afin que ce champ ne contienne que du
    vivant.
38. En tant que développeur, je veux que `move` refuse `doing` pour une spec
    bloquée, afin de ne pas commencer ce qui ne peut pas finir.
39. En tant que membre de l'équipe produit, je veux un ticket Notion par spec,
    afin de suivre le travail technique sans lire le dépôt.
40. En tant que développeur, je veux que `move` mette le ticket à jour, afin de
    ne pas faire le geste deux fois.
41. En tant que membre de l'équipe produit, je veux que `sync` ne réécrive pas
    le corps du ticket, afin de garder mes notes.

Brancher et proposer :

42. En tant que développeur, je veux `tsp branch feat/mon-sujet`, afin de partir
    de `staging` à jour sans y penser.
43. En tant que développeur, je veux que `tsp branch` refuse un type inconnu,
    afin que le nom de branche annonce le type du commit.
44. En tant que développeur, je veux `tsp pr`, afin d'ouvrir la PR vers
    `staging` sans pouvoir me tromper de cible.
45. En tant que développeur, je veux que `tsp pr` refuse un titre hors
    Conventional Commits, afin de ne pas le découvrir à la fusion.
46. En tant que développeur, je veux `tsp pr status`, afin de voir la CI sans
    ouvrir GitHub.

## Implementation Decisions

**Une quatrième app.** `apps/cli` rejoint le workspace. Elle reçoit ce qu'ont
les trois autres : son `AGENTS.md`, son `README.md`, son `verifier`, son job de
CI, son entrée `knip`. Les mentions « les trois apps » du dépôt deviennent
fausses et sont corrigées.

**Pile.** TypeScript exécuté directement par Node 24, sans build, comme
`data-analyzer`. Aucune dépendance d'exécution : les arguments se lisent avec
l'analyseur de Node.

**Le lanceur.** Un script shell POSIX versionné à la racine. Il ne demande qu'un
shell et `git`.

- Il agit sur le clone du répertoire courant. Hors de tout clone, il retombe sur
  celui d'où il a été installé.
- Il exécute la CLI par `mise`, qui fournit Node.
- Sans `mise`, seul `setup` passe. L'installation de `mise` est le seul morceau
  écrit en shell.
- `setup` pose un lien vers le lanceur dans `~/.local/bin`.

**Grammaire.** `tsp <action> [app]`. Sans app, l'action passe sur toutes les
apps qui la portent, une à la fois. Les alias `simulateur`, `data` et
`glossaire` valent le nom complet.

**Une action est un script du `package.json`.** `tsp <action> <app>` lance le
script du même nom. Il n'y a pas de manifeste dédié. Deux exceptions :
`install`, qui appelle `pnpm install` filtré sur l'app, et `features`, qui lit
un fichier. Pour tenir la convention, le simulateur et le glossaire gagnent un
script `dev`.

| Cas | Comportement |
|---|---|
| action absente, app nommée | message clair, code de sortie non nul |
| action absente, sans app | l'app est sautée, une ligne le dit |

**Sorties.** Texte en français par défaut. `--json` sur les commandes de
lecture : `apps`, `features`, `rules`, `skills`, `docs`, `wip`, `next`,
`doctor`, `pr status`. `--yes` répond oui à toute confirmation.

**Langue.** Les noms de commande sont en anglais, comme les scripts `pnpm`.
L'aide et les sorties sont en français. Le code suit la convention du
simulateur : technique en anglais, métier en français.

**`tsp` face à `mise` et `pnpm`.** `mise.toml` perd ses tâches et ne garde que
le toolchain. La CI et le `Procfile` restent sur `pnpm` : la production ne
dépend pas de la CLI. `AGENTS.md` pointe vers `tsp` au lieu de lister les
commandes.

**`features`.** Chaque app tient à la main `docs/knowledge/features.md` : un
tableau « feature, ce qu'elle fait ». `tsp features` l'affiche. Rien ne garde ce
fichier, le risque de péremption est assumé.

**Le mot « feature ».** Il remplace « capacité » partout où ce mot désigne ce
que le logiciel sait faire : le titre de QUAL-011, les quatre gabarits de spec,
`ecrire-une-regle.md`, le skill `implement-publicodes-version`. Soit 8
occurrences, dans un commit à part. Les occurrences métier du simulateur et du
modèle (la capacité du patient) ne bougent pas.

**`rules`.** Un recueil se déduit du nom de son fichier dans
`docs/knowledge/contributing/` : `regles-git.md` donne `git`,
`regles-de-code.md` donne `code`. La liste d'un recueil vient de son tableau
d'index : identifiant, titre, garde. Une règle entière se lit entre son titre et
le séparateur suivant.

**`skills`.** Les skills du dépôt sont ceux de `.claude/skills/`. La liste
affiche le nom et la description de leur en-tête.

**`docs`.** Liste les fichiers des dossiers `adr/` et `domain/`, à la racine et
dans chaque app, avec leur titre et leur chemin. Il n'ouvre rien.

**`wip` et `next`.**

| Source | `wip` | `next` |
|---|---|---|
| GitHub | PR ouvertes | |
| git | branches locales et distantes, dédoublonnées, sans PR, non fusionnées dans `staging` | |
| `docs/tasks`, racine et apps | toutes les tâches | |
| specs, racine et apps | `3. doing` | `2. todo`, puis `1. backlog` |
| Notion, `Status P&T` | `Doing Dev`, `Reviewing dev` | `Ready To Dev` |

Le statut `Staging` de Notion est hors de `wip` : c'est livré. Aucun filtre sur
le propriétaire du ticket. Une spec liée à un ticket n'apparaît qu'une fois.

**Notion.** API officielle, sur la base `[BDD] Tasks`. Le jeton d'intégration et
l'identifiant de la base vivent dans un `.env` racine non versionné, avec son
gabarit. Le dépôt est public : aucun des deux n'y figure. Sans jeton, les
commandes de lecture affichent le reste et la ligne « Notion : jeton absent »,
sans échouer.

**`spec new`.** Crée la spec dans `0. drafts` depuis le gabarit. À la racine par
défaut, dans une app avec `--app`. L'id est unique dans tout le dépôt,
historique git compris : un numéro supprimé ne resert pas.

**`spec move`.** Déplace le fichier par `git mv`.

- Vers `4. done` : retire le renvoi du champ « bloquée par » des specs qu'elle
  bloquait.
- Vers `3. doing` : refuse tant qu'un blocage reste.
- Lance `sync` si un jeton est présent. Sinon il déplace quand même et le dit.

**`spec sync`.** La spec fait foi, à sens unique vers Notion. Sans id, il passe
sur toutes les specs.

| État de la spec | `Status P&T` |
|---|---|
| `0. drafts` | pas de ticket |
| `1. backlog` | `To Do` |
| `2. todo` | `Ready To Dev` |
| `3. doing` | `Doing Dev` |
| `4. done` | `Staging` |

- À la création : titre, statut, `Type` = `Tech`, et dans le corps le
  « Problem Statement » et la « Solution ».
- À la mise à jour : titre, statut et `URL`. Le corps n'est jamais réécrit.
- Un statut plus avancé ne recule jamais. `Reviewing dev` et `Prod / Done` se
  posent à la main.
- Le lien se garde des deux côtés : une ligne `notion` dans l'en-tête de la
  spec, donc dans les quatre gabarits, et la propriété `URL` du ticket, qui
  pointe vers le fichier sur GitHub.

**`branch`.** Récupère le distant, puis tire la branche de `origin/staging`. Il
refuse un type hors Conventional Commits.

**`pr`.** Pousse la branche courante et ouvre la PR. La cible `staging` est
imposée : c'est ce qui applique GIT-009 côté PR. Le titre est vérifié contre
GIT-003. `pr status` affiche l'état de la PR et de ses vérifications.

**`setup`.** Rejouable sans risque. Dans l'ordre :

1. propose d'installer `mise` s'il manque, par son script officiel, après
   confirmation ;
2. installe le toolchain ;
3. installe les dépendances ;
4. branche les hooks git ;
5. crée les `.env` manquants depuis leurs gabarits ;
6. pose le lien vers le lanceur ;
7. finit par `doctor`.

Sans confirmation à l'étape 1, il affiche la commande et s'arrête.

**`doctor`.** Vérifie les versions du toolchain, les hooks, les `.env`,
l'authentification de `gh` et la présence du jeton Notion. Chaque manque nomme
la commande qui le répare.

**Un ADR racine** consigne deux choix durs à défaire : le lanceur shell adossé à
`mise`, et la convention « une action est un script » plutôt qu'un manifeste.

## Testing Decisions

**Aucun test sur la CLI.** C'est une décision du porteur.

- Le `verifier` de `apps/cli` passe le lint, le typecheck et knip.
- `apps/cli` n'a pas de script `test` : `tsp test cli` répond « action
  absente ».
- Les gardes de forme écrites en tests dans le simulateur (`lisibilite`,
  `architecture`) ne couvrent pas `apps/cli`. Seul Biome y garde la forme.

Conséquence assumée : une régression d'une commande se voit à l'usage, pas en
CI.

## Out of Scope

- La fusion d'une PR. Elle reste un geste humain sur GitHub.
- Un passe-plat `tsp gh …` vers le reste de `gh`.
- La livraison d'une version. Le skill `livrer-une-version` la porte.
- La synchronisation de Notion vers les specs.
- Un ticket Notion pour les tâches de `docs/tasks`.
- Le passage de la CI et du `Procfile` à `tsp`.
- Windows hors WSL.

## Further Notes

**Prérequis hors dépôt.** `spec sync` écrit dans Notion. Il faut une intégration
interne avec les droits de lecture et d'écriture, partagée avec `[BDD] Tasks`.
Elle se crée par quelqu'un qui administre l'espace de travail.

**Deux propriétés de statut.** `[BDD] Tasks` porte `Status` et `Status P&T`.
Seule la seconde a `Ready To Dev`. La CLI ne lit et n'écrit que celle-là.

**Ordre conseillé pour le découpage.** Le lanceur et `setup` d'abord : rien ne
se lance sans eux. Puis les actions par app, qui remplacent les tâches `mise`.
Les commandes de lecture locales suivent. Notion et GitHub viennent en dernier :
ce sont les seules qui demandent un accès extérieur.

**Vocabulaire.** Les termes « feature », « recueil », « action » et « ticket »
sont définis dans le glossaire de la racine, `docs/knowledge/CONTEXT.md`.
