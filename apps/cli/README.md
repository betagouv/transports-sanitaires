# tsp

`tsp` (pour « transport sanitaire ») est le point d'entrée du dépôt. Il rassemble
ce qui demandait de retenir `mise`, `pnpm`, `git`, `gh`, Notion et quatre
trackers de specs.

## Installer

Sur une machine neuve, depuis la racine du dépôt :

```bash
./tsp setup
```

Seuls un shell et `git` sont requis. `setup` fait le reste, dans l'ordre :

1. propose d'installer `mise` s'il manque, après confirmation ;
2. installe le toolchain épinglé dans `mise.toml` (Node, pnpm, `gh`) ;
3. installe les dépendances ;
4. branche les hooks git ;
5. crée les `.env` manquants depuis leurs gabarits ;
6. pose un lien `~/.local/bin/tsp`, pour appeler `tsp` de partout. Un lien qui
   marche déjà est gardé : `setup` lancé depuis un worktree ne le détourne pas ;
7. finit par `tsp doctor`.

Il se rejoue sans risque. Un agent passe `--yes` pour ne recevoir aucune
question.

## Les commandes

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
| `tsp setup` | prépare la machine |
| `tsp doctor` | dit ce qui manque, et la commande qui le répare |
| `tsp apps` | liste les apps, leur version, leurs actions |
| `tsp rules` | liste les recueils de règles |
| `tsp rules git` | liste les règles d'un recueil |
| `tsp rules GIT-009` | affiche une règle entière |
| `tsp skills` | liste les skills du dépôt |
| `tsp skills <skill>` | affiche un skill |
| `tsp docs [app]` | liste les ADR et les connaissances métier |
| `tsp wip` | montre le travail en cours |
| `tsp next` | montre le travail en cours, puis le travail à prendre |
| `tsp spec new <module> <type> <titre>` | crée une spec avec le prochain id, `--app <app>` pour le tracker d'une app |
| `tsp spec move <id> <état>` | change une spec d'état |
| `tsp spec sync [id]` | crée ou met à jour le ticket Notion d'une spec |
| `tsp branch <type>/<sujet>` | tire une branche de `staging` |
| `tsp pr` | pousse la branche et ouvre la PR vers `staging` |
| `tsp pr status` | montre l'état de la PR courante et de sa CI |

`tsp help` affiche cette liste. Les commandes de lecture acceptent `--json`.
`tsp rules --json` rend chaque recueil avec ses règles.

## Les apps et leurs actions

Une app se nomme en entier ou par un début sans ambiguïté : `simulateur`,
`data`, `glossaire`, `cli`.

**Une action est un script du `package.json` de l'app.** `tsp dev glossaire`
lance son script `dev`. Pour qu'une app porte une action, il suffit d'écrire le
script. `install` fait exception : il appelle `pnpm install`.

| Cas | Ce qui se passe |
|---|---|
| l'app nommée ne porte pas l'action | un message, code de sortie 1 |
| sans app | l'action passe sur chaque app qui la porte, une à la fois. Les autres sont sautées, une ligne le dit |
| `dev` ou `start` sans app, portées par plusieurs apps | `tsp` demande d'en nommer une : ces actions ne rendent pas la main |

Ce qui suit `--` part tel quel au script :

```bash
tsp test simulateur -- tests/cerfa
```

## Le travail en cours et à prendre

| Source | `tsp wip` | `tsp next` |
|---|---|---|
| GitHub | les PR ouvertes | |
| git | les branches locales et distantes non fusionnées dans `staging`, sans PR ouverte ni fusionnée | |
| `docs/tasks`, racine et apps | toutes les tâches | |
| specs, racine et apps | `3. doing` | `2. todo`, puis `1. backlog` |
| Notion | `Doing Dev`, `Reviewing dev` | `Ready To Dev` |

`tsp next` affiche d'abord tout ce qu'affiche `tsp wip`, puis sa propre colonne :
on ne choisit pas la suite sans voir ce qui est déjà commencé. En JSON, le
travail en cours est sous la clé `wip`.

Une spec liée à un ticket n'apparaît qu'une fois, du côté des specs.

## Les specs

```bash
tsp spec new cli feat "Complétion du shell"
tsp spec new cerfa fix "Date de naissance tronquée" --app simulateur
tsp spec move 12 todo
```

- L'id suit le plus grand jamais utilisé dans le dépôt, historique git compris.
  Un numéro supprimé ne resert pas.
- L'état se tape par son nom ou son chiffre : `doing`, `3`.
- Passer une spec en `done` la retire du champ « bloquée par » des autres.
- `move` refuse `doing` tant qu'un blocage reste.
- `move` met à jour le ticket Notion si un jeton est présent.

### Le ticket Notion

`tsp spec sync` tient un ticket par spec dans la base des tickets. La spec fait
foi, à sens unique.

| État de la spec | `Status P&T` du ticket |
|---|---|
| `0. drafts` | pas de ticket |
| `1. backlog` | `To Do` |
| `2. todo` | `Ready To Dev` |
| `3. doing` | `Doing Dev` |
| `4. done` | `Staging` |

- À la création : le titre, le statut, le type `Tech`, et dans le corps le
  « Problem Statement » et la « Solution ». L'adresse du ticket est écrite dans
  l'en-tête de la spec, ligne `notion` : à commiter.
- Ensuite : le titre, le statut et l'adresse du fichier sur GitHub. Le corps
  n'est jamais réécrit.
- Un statut ne recule jamais. `Reviewing dev` et `Prod / Done` se posent à la
  main dans Notion.

## Les branches et les PR

```bash
tsp branch fix/libelle-article-80
tsp pr
tsp pr status
```

- `branch` refuse un type hors Conventional Commits.
- `pr` vise toujours `staging` (GIT-009). Son titre est le sujet du premier
  commit de la branche, ou `--title`. Il doit respecter GIT-003.
- `--body-file <fichier>` donne le corps de la PR. Un chemin relatif part du
  dossier courant. Sans lui, le corps est celui des commits.
- La fusion reste un geste humain sur GitHub.

## Configuration

`tsp` lit l'environnement, puis le `.env` de la racine. `setup` le crée depuis
`.env.example`. Il n'est jamais versionné : le dépôt est public.

| Variable | Rôle |
|---|---|
| `NOTION_TOKEN` | le jeton d'une intégration Notion interne, avec lecture et écriture, partagée avec la base des tickets |
| `NOTION_DATABASE_ID` | l'identifiant de la base des tickets |
| `NOTION_API_URL` | facultatif. Remplace l'adresse de l'API, pour éprouver la CLI sur un serveur local |

Sans jeton, `wip` et `next` affichent le reste et la ligne
« Notion : jeton absent ». Seul `spec sync` s'arrête.

## Comment c'est fait

`tsp`, à la racine, est un script shell. Il choisit le clone, puis exécute
`src/main.ts` par `mise`, qui fournit Node. La CLI est du TypeScript exécuté
directement, sans build et sans dépendance d'exécution.

- **Depuis un worktree**, `tsp` exécute la CLI de ce worktree. On essaie donc la
  version qu'on modifie.
- **Hors de tout clone**, il retombe sur celui d'où il a été installé.
- **Sans `mise`**, seul `setup` passe : c'est lui qui l'installe, par
  `amorce.sh`, le seul morceau de `setup` écrit en shell.

La CI et le `Procfile` appellent `pnpm` en direct. La production ne dépend pas
de la CLI.

## Vérifier

```bash
tsp verifier cli
```

Lint, typecheck et knip. L'app n'a pas de tests : une commande se vérifie en la
lançant. Voir [AGENTS.md](AGENTS.md).
