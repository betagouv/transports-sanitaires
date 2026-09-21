# AGENTS.md

> Ce qui vaut pour tout le dépôt. Le reste est dans l'app concernée.

## Communication

> Concerne TOUTES TRACES : prompts, code, documentation, messages de commit.

### TOUJOURS
- Être concis
- Écrire en français
- Utiliser des mots simples
- Faire des phrases courtes

### JAMAIS
- De tirets cadratins
- De sentence en fin de paragraphe
- De flatterie

### PRÉFÉRER
- Les listes à puces quand on énumère 3 éléments ou plus
- Les tableaux quand les listes ne suffisent pas
- Les exemples plutôt que les longues phrases

## Le dépôt

Monorepo en **workspace pnpm**. Le `pnpm-workspace.yaml` de la racine déclare
`apps/*`. Il en découle :

- une seule installation, à la racine ;
- un seul `pnpm-lock.yaml` ;
- un magasin de paquets mutualisé.

Le toolchain vient de `mise` :

- Node 24
- pnpm
- `gh`, pour publier la release d'une livraison

`pnpm install` à la racine monte les trois apps.

Les apps restent **indépendantes de code**. Aucune n'importe une autre. Chacune a
son `package.json`, son job CI et son `pnpm verifier`. Le workspace mutualise
l'installation, pas les frontières.

Deux conséquences qui ne sont pas cosmétiques.

**Une version d'outil partagé s'écrit dans le `catalog:` du
`pnpm-workspace.yaml`**, jamais dans une app. Les apps y renvoient par
`"typescript": "catalog:"`. Sans ça, deux apps peuvent tourner sur deux Biome,
avec un `verifier` vert dans l'une et rouge dans l'autre. Une dépendance propre à
une app (`express`, `publicodes`, `xlsx`) reste chez elle.

**pnpm ne résout pas les dépendances fantômes.** Un paquet utilisé sans être
déclaré marchait sous npm, par hoisting. Ici il casse.

Exemple : `glossaire-notion` compilait avec `types: ["node"]` sans avoir jamais
listé `@types/node`. La correction est toujours de déclarer la dépendance.

**Avant de toucher à `apps/X`, lis `apps/X/AGENTS.md`.** Ce fichier-ci ne décrit
aucune app.

| App | Ce que c'est |
|---|---|
| `apps/simulateur-eligibilite` | Le produit. Simulateur d'éligibilité au transport sanitaire : règles publicodes, front React/DSFR, backend Express, identification du prescripteur, remplissage du CERFA. |
| `apps/data-analyzer` | L'ETL qui calcule la part des trajets réalisés via les plateformes. Code public, **données et fournisseurs privés**. |
| `apps/glossaire-notion` | Une extension de navigateur qui affiche le glossaire tenu dans Notion. |

## Vérifier

`pnpm verifier`, dans l'app. **C'est la commande à passer avant de dire que c'est
fait.** La CI lance exactement la même : un `verifier` vert ici l'est là-bas. Une
porte à ajouter se met dans ce script, jamais dans le YAML.

À la racine, `pnpm verifier` le passe sur les trois apps, une à la fois.
`mise run verifier` l'appelle.

`pnpm audit` ne se scope pas à une app : il lit le lock, et le lock est unique
au dépôt. Il a son job de CI à la racine.

## Français

**Français partout** :

- l'interface
- les noms de règles
- les tests
- la documentation
- les messages de commit
- **les identifiants**

L'anglais est réservé à ce qu'une API tierce nomme déjà ainsi :

| Termes tolérés | Source |
|---|---|
| `handleX`, `useX`, `Props` | React |
| `track*` | Matomo |
| `label`, `nativeInputProps` | DSFR |
| `formState`, `pageCount` | `@publicodes/forms` |
| `fields`, `rowId` | Grist |
| `Engine` | publicodes |

Tout le reste est du vocabulaire métier et se lit en français : `moteur`,
`regles`, `passation`, `casesRetenues`, `identiteEnSession`.

*Gardé par* `tests/lisibilite.test.ts › les identifiants sont en français`. Sa
liste `TOLERES` autorise les exceptions. L'y ajouter est une décision, pas un
moyen de faire passer le test.

**Une dérogation assumée** : `apps/glossaire-notion` est entièrement en anglais.
Elle n'a pas de vocabulaire métier propre. C'est un lecteur de base Notion, et la
franciser coûterait plus que ça ne clarifierait.

## Écrire du code et commiter

23 règles numérotées vivent dans `docs/knowledge/contributing/`. **À lire avant
d'écrire une ligne ou de commiter.**

| Fichier | Ce qu'il porte |
|---|---|
| [`regles-de-code.md`](docs/knowledge/contributing/regles-de-code.md) | les 15 `QUAL-*` : forme d'un fichier, découpage, noms, exports, suppressions de lint |
| [`regles-git.md`](docs/knowledge/contributing/regles-git.md) | les 8 `GIT-*` : branche ou `main`, forme du message, métadonnée d'IA, confidentialité |

Chaque règle porte un identifiant, sa raison, un exemple juste, un exemple faux,
et la garde qui l'applique. **Ne les recopie pas ici.** Cite l'identifiant en
revue et en commit : « corrige QUAL-006 ».

## Où écrire quoi

| Ce que tu veux écrire | Où ça va |
|---|---|
| Une décision d'architecture | `docs/knowledge/adr/` de l'app concernée, ou celui de la racine si la décision traverse plusieurs apps. Format ADR maison, au niveau composant C4, sans détail de fichier |
| Le cadrage d'un chantier | `docs/specs/` (tracker `0. drafts` → `4. done`), à la racine ou dans l'app |
| Une connaissance métier actée | `docs/knowledge/domain/` de l'app concernée, ou celui de la racine si elle traverse plusieurs apps |
| Le mode d'emploi d'une app | son `README.md` |
| Ce qu'une version apporte | le `CHANGELOG.md` de l'app. Un TL;DR, puis une ligne par commit groupée par type |
| Une règle pour l'IA | `AGENTS.md`, celui de la racine ou celui de l'app |
| Une règle de code ou de commit | `docs/knowledge/contributing/`, avec un identifiant, une raison et deux exemples |
| Une garde | **un test**, pas une phrase |

Ce que `docs/knowledge/` contient aujourd'hui ne se recopie pas ici : liste les
dossiers `adr/` et `domain/` de la racine et de chaque app plutôt que de te fier
à un inventaire, qui se périmerait au premier fichier ajouté ou déplacé.

**Quand deux sources se contredisent**, l'ordre d'autorité est :

**le test > le code > le README de l'app > `docs/knowledge/adr/` > `docs/knowledge/domain/`**

Cette chaîne classe ce qui *décrit* le dépôt. `AGENTS.md` et
`docs/knowledge/contributing/` *prescrivent*. Ils ne se périment pas contre le
code : c'est le code qui a tort contre eux.

Les specs se périment. Exemple : `etl-part-plateformes.md` annonce 5 marts, le
README de `data-analyzer` en documente 6. Corrige la source la moins à jour, ne
t'y fie pas.

## Marches à suivre

Six gestes récurrents ont leur mode d'emploi dans `.claude/skills/`, chargé à la
demande plutôt que recopié ici :

| Skill | Quand |
|---|---|
| `regle-de-contribution` | Ajouter, modifier ou retirer une règle de `docs/knowledge/contributing/` : identifiant, raison, deux exemples, garde nommée |
| `regle-publicodes` | Toucher au modèle d'éligibilité : les quatre endroits qu'une règle traverse, et l'encodage des choix multiples en mosaïque |
| `situation-de-reference` | Couvrir un cas métier : il va dans le catalogue de seeds, pas dans un fichier de test |
| `implement-publicodes-version` | Intégrer une version du modèle livrée par l'éditeur : le diff du paquet, le contrat, les seeds, la recette portée, le retour à l'éditeur |
| `doc-architecture` | Écrire ou réviser un document de `docs/knowledge/adr/` : format ADR maison, décisions révoquées conservées et barrées |
| `livrer-une-version` | Livrer une app : numéro, journal des versions, tag `<app>@<version>` et release GitHub, qui vont ensemble |

## Toute règle nomme sa garde

**Une règle de forme nomme l'assertion qui la garde. Sans assertion, elle
n'existe pas.** Mieux vaut l'écrire dans un test que la répéter ici.

Exemple : neuf fichiers ouvraient sur un `import` pendant des mois, sous une
règle qui l'interdisait, parce que rien ne la vérifiait.

Une règle de jugement, elle, ne se mécanise pas. Une assertion dirait *qu'*on a
coupé, jamais *si* on a coupé au bon endroit. Elle écrit alors `*Aucune garde.*`
en toutes lettres, plutôt que de laisser croire qu'elle en a une.

L'état de chaque règle des 23 de
[`docs/knowledge/contributing/`](docs/knowledge/contributing/) se lit dans la
colonne « Garde » de son tableau, pas ici : recopier cet état dans ce fichier
créerait deux sources à tenir à jour au lieu d'une.
