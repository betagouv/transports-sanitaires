# AGENTS.md

> Ce qui vaut pour tout le dépôt. Le reste est dans l'app concernée.

## Communication

Être concis. Poser les questions produit, architecture et code plutôt que de
deviner.

Écrire simplement, en phrases normales. Pas de formules travaillées, pas de
tirets cadratins en cascade, pas de sentence en fin de paragraphe. Ça vaut pour
la conversation comme pour ce qu'on écrit dans le dépôt : messages de commit,
README, documentation, journal des versions. Le fond peut être argumenté et
détaillé, la forme reste simple.

Ne jamais flatter. Ne jamais dire que c'est fait sans l'avoir vérifié.

## Le dépôt

Monorepo en **workspace pnpm**. Le `pnpm-workspace.yaml` de la racine déclare
`apps/*` : une seule installation, un seul `pnpm-lock.yaml`, un magasin de
paquets mutualisé. Le toolchain vient de `mise` : Node 24, pnpm, et `gh` pour
publier la release d'une livraison. `pnpm install` à la racine suffit à monter
les trois apps.

Les apps restent **indépendantes de code** : aucune n'importe une autre, chacune
a son `package.json`, son job CI et son `pnpm verifier`. Ce que le workspace
mutualise, c'est l'installation, pas les frontières.

Deux conséquences qui ne sont pas cosmétiques :

- **Une version d'outil partagé s'écrit dans le `catalog:` du
  `pnpm-workspace.yaml`, jamais dans une app.** Les apps y renvoient par
  `"typescript": "catalog:"`. C'est ce qui rend impossible le cas où deux apps
  tournent sur deux Biome, avec un `verifier` vert dans l'une et rouge dans
  l'autre. Une dépendance propre à une app (`express`, `publicodes`, `xlsx`)
  reste chez elle.
- **pnpm ne résout pas les dépendances fantômes.** Un paquet utilisé sans être
  déclaré marchait sous npm par hoisting ; ici il casse. C'est la bonne nouvelle
  du changement, pas un accident : `glossaire-notion` compilait avec
  `types: ["node"]` sans avoir jamais listé `@types/node`. La correction est
  toujours de déclarer la dépendance.

**Avant de toucher à `apps/X`, lis `apps/X/AGENTS.md`.** Ce fichier-ci ne décrit
aucune app.

| App | Ce que c'est |
|---|---|
| `apps/simulateur-eligibilite` | Le produit. Simulateur d'éligibilité au transport sanitaire : règles publicodes, front React/DSFR, backend Express, identification du prescripteur, remplissage du CERFA. |
| `apps/data-analyzer` | L'ETL qui calcule la part des trajets réalisés via les plateformes. Code public, **données et fournisseurs privés**. |
| `apps/glossaire-notion` | Une extension de navigateur qui affiche le glossaire tenu dans Notion. |

## Vérifier

`pnpm verifier`, dans l'app. **C'est la commande à passer avant de dire que
c'est fait.** C'est aussi, mot pour mot, ce que lance la CI : un `verifier` vert
ici l'est là-bas. Une porte à ajouter se met dans ce script, jamais dans le YAML.

`pnpm verifier` à la racine — ou `mise run verifier`, qui l'appelle — le passe
sur les trois apps, une à la fois.

Une exception au « tout est dans le `verifier` de l'app » : **l'audit des
dépendances**. `pnpm audit` lit le lock, et le lock est unique au dépôt. Il a
donc son job de CI à la racine plutôt que d'être répété trois fois en laissant
croire qu'il est scopé.

## Français

**Français partout** : interface, noms de règles, tests, documentation, messages
de commit, **et identifiants**. L'anglais est réservé à ce qu'une API tierce
nomme déjà ainsi : `handleX` / `useX` / `Props` (React), `track*` (le verbe de
Matomo), `label` et `nativeInputProps` (DSFR), `formState` / `pageCount`
(`@publicodes/forms`), `fields` / `rowId` (Grist), `Engine` (publicodes). Tout le
reste est du vocabulaire métier et se lit en français : `moteur`, `regles`,
`passation`, `casesRetenues`, `identiteEnSession`.

*Gardé par* `tests/lisibilite.test.ts › les identifiants sont en français`. Sa
liste `TOLERES` est ce qui autorise une exception : l'y ajouter est une décision,
pas un moyen de faire passer le test.

**Une dérogation assumée** : `apps/glossaire-notion` est entièrement en anglais.
Elle n'a pas de vocabulaire métier propre, c'est un lecteur de base Notion, et la
franciser coûterait plus que ça ne clarifierait.

## Écrire du code

- **Un fichier se lit de haut en bas comme son contrat, puis son
  implémentation.** Dans l'ordre : un en-tête de quelques lignes qui dit *ce que
  ce fichier permet de faire* (le pourquoi, l'histoire et les contraintes
  descendent à côté du code qu'ils expliquent, pas dans un préambule) ; les types
  publics ; les exports, dans l'ordre où un appelant les rencontre ; puis
  `// ---- implémentation ----` et tout ce qui est privé.

  Deux conséquences qui ne sont pas cosmétiques. Les fonctions privées sont des
  `function` hoistées et non des `const` fléchés : une flèche déclarée sous son
  premier appel lève une erreur TDZ à l'exécution. Et les constantes privées
  descendent en bas dès qu'elles ne sont lues que dans des fonctions. Aucun
  travail au chargement du module, sauf un point d'entrée explicite en tête.

  *Gardé par* `tests/lisibilite.test.ts › un fichier se lit comme son contrat`.

- **Couper aux jointures du sens, jamais pour tenir dans le budget.** La limite
  de 30 lignes *détecte* une fonction qui fait plusieurs choses ; elle ne dit pas
  *où* couper. Le test : **ferais-tu la même extraction si la limite n'existait
  pas ?** Sinon, tu coupes au mauvais endroit. Quatre conséquences :

  - **Séparer les branches, pas la répétition.** Un branchement sur des cas
    métier est la jointure : chaque branche devient une fonction nommée d'après
    le cas qu'elle répond, et le parent se réduit à un aiguillage d'une ligne.
    Extraire le fragment que les branches partagent est la coupe la moins chère
    et la mauvaise : elle laisse le parent faire exactement ce qu'il faisait,
    moins quelques lignes.
  - **Un nom doit ajouter ce que le site d'appel ne dit pas déjà.**
    `<PiedDePage />` en bas d'une page n'apprend rien ; `<AucunTransportPrescrit />`
    dit quelle situation est répondue. Un nom qui décrit le balisage
    (`Introduction`, `EnTetes`) marque un fragment, pas une intention.
  - **Répéter un contenu littéral vaut mieux que fabriquer un fragment sans
    nom.** Deux `<li>` identiques dans deux branches ne coûtent rien. Un
    composant d'une ligne sans intention coûte un saut à chaque lecteur. On ne
    factorise que ce qui a un nom propre, et qui prend alors des paramètres et
    sert des appelants sans rapport.
  - **Une fonction choisit, les autres font.** Jamais une qui choisit *et* fait.

  Même chose quand la limite de 300 lignes mord : séparer un fichier par sujet,
  jamais en déplaçant le débordement ailleurs.

  *Gardé par* `tests/architecture.test.ts › taille du code`, en lignes réelles.
  Biome porte les mêmes limites pour le retour dans l'éditeur, mais il compte des
  lignes *logiques* : un bloc de texte JSX y pèse une ligne. C'est le test qui
  fait foi.

- **Un fichier porte le nom d'une capacité, pas d'une catégorie.** Si le nom a
  besoin d'`utils`, `helpers`, `commun` ou `acces` pour fonctionner, le fichier
  n'a pas d'intention et son contenu appartient à ses appelants.

  *Gardé par* `tests/lisibilite.test.ts › aucun fichier ne porte un nom de
  catégorie`.

- **N'exporter que ce qu'un autre fichier importe.** Le fichier aujourd'hui
  appelé `deverrouillage.ts` a livré deux `export const` que personne ne lisait,
  posés au-dessus de la seule fonction qui comptait.

  *Gardé par* `pnpm knip`, dans `verifier`. Un export qui est de la
  documentation et non du code appelé le déclare par un `@public` motivé.

- **Le style ne se discute pas.** Biome tient le format, l'ordre des imports et
  le lint, avec le même socle (`biome.base.jsonc`) pour les trois apps. Ne jamais
  formater à la main, et ne jamais écrire une suppression pour un linter que le
  projet ne lance pas : un `eslint-disable` a dormi des mois dans `Parcours.tsx`
  sans rien supprimer. Une suppression s'écrit `// biome-ignore <règle>:
  <raison>` sur la ligne **immédiatement** avant la ligne fautive, la raison en
  toutes lettres.

  Un hook `PostToolUse` passe Biome sur chaque `.ts` / `.tsx` écrit, dans
  n'importe quelle app : le format n'est jamais à toi de défendre.

## Git

- **Travailler sur `main` par défaut.** Commiter directement, pas de branche de
  fonctionnalité, pas de PR.

  L'exception est le changement **structurant qu'un feature flag ne peut pas
  masquer** : celui qui touche l'ossature — le modèle de règles, l'enchaînement
  des écrans, le format d'un livrable — au point qu'aucun drapeau ne rendrait le
  produit livrable à mi-chemin. Il vit alors sur une branche jusqu'à ce qu'il
  tienne debout, puis rejoint `main` d'un bloc. C'est le régime dans lequel a été
  menée la mise à disposition de la PMT au format PDF.

  Le doute se tranche vers `main` : si un drapeau *pourrait* masquer le travail
  en cours, il n'y a pas de branche à ouvrir. Une branche coûte une divergence à
  réconcilier, et ce coût ne se justifie que là où le drapeau est impossible, pas
  là où il est seulement moins commode.

- **Conventional Commits**, scope entre parenthèses (`simulateur`,
  `data-analyzer`, `identification`) quand le changement est circonscrit à une
  app.
- **Sujet en français, verbe conjugué à la 3ᵉ personne de l'indicatif présent** :
  « coupe aux jointures du sens », « plafonne les fonctions à 30 lignes »,
  « rend les invariants d'architecture exécutables ». Ni impératif, ni infinitif.
  Même règle pour les lignes du journal des versions, qui décrivent un commit.
- **Corps argumenté** : ce qui change, et surtout *pourquoi*. Nommer les
  renommages un par un. Terminer par l'état de vérification (« 184 tests verts,
  bundle et aperçu CERFA inchangés »). Argumenté ne veut pas dire littéraire :
  des phrases normales.
- **Aucune métadonnée d'IA dans le message**, nulle part, trailers compris : ni
  `Co-Authored-By`, ni `Claude-Session`, ni lien de session, ni mention d'un
  outil ou d'un modèle qui aurait tenu le clavier — ni « Claude », ni « Opus 5 »,
  ni « Sonnet », ni un numéro de version. Un message de commit dit ce qui change
  et pourquoi ; par qui n'apprend rien à qui relit l'historique, et ces noms-là
  changent bien plus vite que le dépôt.
- **Avant de commiter sur `data-analyzer`** : relire le diff *et le message* pour
  vérifier qu'aucun nom de fournisseur ni donnée n'y figure (cf.
  `apps/data-analyzer/AGENTS.md`).

## Où écrire quoi

| Ce que tu veux écrire | Où ça va |
|---|---|
| Une décision d'architecture | `docs/architecture/` — format ADR maison, au niveau composant C4, sans détail de fichier |
| Le cadrage d'un chantier | `docs/specs/` |
| Le mode d'emploi d'une app | son `README.md` |
| Ce qu'une version apporte | le `CHANGELOG.md` de l'app — un TL;DR, puis une ligne par commit groupée par type |
| Une règle pour l'IA | `AGENTS.md`, celui de la racine ou celui de l'app |
| Une garde | **un test**, pas une phrase |

`docs/architecture/` contient `identification.md` et `analytics.md`.
`docs/specs/` contient le cadrage de l'ETL, celui de l'enrichissement du
référentiel, la convention d'encodage des questions à choix multiple, et deux
specs **produit** — `page-resultat-medical.md` et `page-resultat-administratif.md`,
qui sont le contenu rédactionnel de référence des deux pages de résultat.

**Quand deux sources se contredisent**, l'ordre d'autorité est :

**le test > le code > le README de l'app > `docs/architecture/` > `docs/specs/`**

Les specs se périment : `etl-part-plateformes.md` annonce 5 marts, le README de
`data-analyzer` en documente 6. Corrige la source la moins à jour, ne t'y fie
pas.

## Marches à suivre

Quatre gestes récurrents ont leur mode d'emploi dans `.claude/skills/`, chargé à
la demande plutôt que recopié ici :

| Skill | Quand |
|---|---|
| `regle-publicodes` | Toucher au modèle d'éligibilité — les quatre endroits qu'une règle traverse, et l'encodage des choix multiples en mosaïque |
| `situation-de-reference` | Couvrir un cas métier : il va dans le catalogue de seeds, pas dans un fichier de test |
| `doc-architecture` | Écrire ou réviser un document de `docs/architecture/` — format ADR maison, décisions révoquées conservées et barrées |
| `livrer-une-version` | Livrer une app — numéro, journal des versions, tag `<app>@<version>` et release GitHub, qui vont ensemble |

## La règle qui tient les autres

**Toute règle de forme énoncée ici nomme l'assertion qui la garde. Sans
assertion, elle n'existe pas** — et il vaut mieux l'écrire dans un test que la
répéter ici. C'est la seule chose qui empêche ce fichier de redevenir une prose
que le code contredit : neuf fichiers ouvraient sur un `import` pendant des mois
sous une règle qui l'interdisait, parce que rien ne la vérifiait.
