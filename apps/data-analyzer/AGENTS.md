# AGENTS.md - data-analyzer

> Les conventions du dépôt sont dans [`../../AGENTS.md`](../../AGENTS.md). Ici,
> ce qui est propre à cette app.

## À lire en premier : confidentialité

**Le monorepo est public ; les données et l'identité des fournisseurs ne le sont
pas.**

Le code de l'ETL est générique. Il ne connaît que deux choses :

- des **rôles** : `plateforme`, `referentiel-national`, `referentiel-ght` ;
- des **formats de fichier**.

Jamais l'identité d'un fournisseur, jamais la moindre donnée. L'association entre
les fichiers réels et ces formats vit dans `mapping.json`, **non versionné**. Son
gabarit neutre est `mapping.example.json`.

| Statut | Fichiers |
|---|---|
| **Jamais versionnés** | `data/` (sources brutes), `build/` (tous les artefacts, dont des marts contenant de vrais établissements), `mapping.json`, `.env` |
| **Versionnés** | `src/` (code générique), `ref/` (open data figé + mappings manuels), `mapping.example.json` |

Un nom de fournisseur fuite par quatre chemins :

- un commentaire,
- un nom de variable,
- un fichier de test,
- **un message de commit**.

Relis le diff *et* le message avant de commiter. Les libellés de véhicule et les
noms de colonnes des adaptateurs décrivent des **formats**, jamais des
fournisseurs. Garde-le ainsi en ajoutant un adaptateur.

## Ce que ça calcule

La **part des trajets réalisés via les plateformes** (numérateur), rapportée au
**référentiel national de remboursement** (dénominateur). Ventilée par
établissement ou GHT, par année, par type de transport et par enveloppe.

Deux sources écrites, dans cet ordre d'autorité :

1. le [README](README.md), qui fait autorité sur les livrables et les points
   d'attention métier ;
2. [`docs/specs/etl-part-plateformes.md`](../../docs/specs/etl-part-plateformes.md),
   qui porte le cadrage.

**Le README est le plus à jour des deux** : la spec annonce 5 marts, il y en a 6.

## Le pipeline

C'est du **TypeScript exécuté directement par Node 24** (effacement de types),
sans build. Les dossiers portent leur ordre :

| Étape | Ce qu'elle fait |
|---|---|
| `src/01-extract/` | applique à chaque fichier l'**adaptateur de son format** → lignes normalisées. Un format = un adaptateur dans `adapteurs/`, déclaré dans `registry.ts`. |
| `src/02-staging/` | normalise et empile |
| `src/03-reconcile/` | ré-clé sur l'**autorité du référentiel**, puis rattache au GHT |
| `src/04-marts/` | le même calcul à différents grains, un fichier par mart |
| `src/05-publish/` | publication Grist (document cible **privé**) |

`pnpm etl` enchaîne tout. Chaque étape est aussi lançable seule : `pnpm extract`,
`staging`, `reconcile`, `marts`, `publish-grist`.

`pnpm fetch-ght` rafraîchit `ref/ght/`. Elle est hors chaîne parce que `ref/` est
versionné : l'ETL tourne donc sans réseau.

## Vérifier

`pnpm verifier` : lint (Biome), typecheck, knip, tests. Il n'y a pas de build.

## Tests

**Sans mock** :

- lecture de vrais bundles FHIR,
- aller-retour CSV RFC 4180,
- calcul de marts en mémoire.

Aucune donnée réelle dans les fixtures.

## Dette nommée

**Des modules déguisés en classes.** `Csv`, `Xlsx`, `Paths` et `Mapping` sont des
classes à membres uniquement statiques, ce que Biome signale
(`noStaticOnlyClass`, en avertissement). Les convertir en fonctions exportées
touche une centaine d'appels. **À payer quand un de ces modules sera rouvert.**
Pas avant, et pas par un `off` dans la configuration.

**`noNonNullAssertion` est éteinte dans `src/`**, pour une raison précise. Le
tsconfig active `noUncheckedIndexedAccess`, qui rend `ligne[colonne]`
potentiellement `undefined`.

C'est la garantie forte, on la garde. Le `!` en est le prix sur une colonne qu'on
vient de lire dans l'en-tête. On éteint la règle faible pour tenir la forte.
