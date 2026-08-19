# AGENTS.md — data-analyzer

> Les conventions du dépôt sont dans [`../../AGENTS.md`](../../AGENTS.md). Ici,
> ce qui est propre à cette app.

## À lire en premier — confidentialité

**Le monorepo est public ; les données et l'identité des fournisseurs ne le sont
pas.** Le code de l'ETL est générique : il ne connaît que des **rôles**
(`plateforme`, `referentiel-national`, `referentiel-ght`) et des **formats de
fichier**, jamais l'identité d'un fournisseur ni la moindre donnée. L'association
entre les fichiers réels et ces formats vit dans `mapping.json`, **non
versionné** (gabarit neutre : `mapping.example.json`).

- **Jamais versionnés** : `data/` (sources brutes), `build/` (tous les artefacts,
  dont des marts contenant de vrais établissements), `mapping.json`, `.env`.
- **Versionnés** : `src/` (code générique), `ref/` (open data figé + mappings
  manuels), `mapping.example.json`.

Un nom de fournisseur fuite aussi bien par un commentaire, un nom de variable,
un fichier de test **ou un message de commit**. Relis le diff *et* le message
avant de commiter. Les libellés de véhicule et les noms de colonnes des
adaptateurs décrivent des **formats**, jamais des fournisseurs — garde-le ainsi
en ajoutant un adaptateur.

## Ce que ça calcule

La **part des trajets réalisés via les plateformes** (numérateur), rapportée au
**référentiel national de remboursement** (dénominateur), par établissement /
GHT × année × type de transport × enveloppe.

Le [README](README.md) fait autorité sur les livrables et les points d'attention
métier ; [`docs/specs/etl-part-plateformes.md`](../../docs/specs/etl-part-plateformes.md)
porte le cadrage. **Le README est le plus à jour des deux** : la spec annonce
5 marts, il y en a 6.

## Le pipeline

C'est du **TypeScript exécuté directement par Node 24** (effacement de types),
pas de build. Les dossiers portent leur ordre :

| Étape | Ce qu'elle fait |
|---|---|
| `src/01-extract/` | applique à chaque fichier l'**adaptateur de son format** → lignes normalisées. Un format = un adaptateur dans `adapteurs/`, déclaré dans `registry.ts`. |
| `src/02-staging/` | normalise et empile |
| `src/03-reconcile/` | ré-clé sur l'**autorité du référentiel**, puis rattache au GHT |
| `src/04-marts/` | le même calcul à différents grains — un fichier par mart |
| `src/05-publish/` | publication Grist (document cible **privé**) |

`npm run etl` enchaîne tout ; chaque étape est aussi lançable seule
(`npm run extract`, `staging`, `reconcile`, `marts`, `publish-grist`).
`npm run fetch-ght` rafraîchit `ref/ght/` — hors chaîne, puisque `ref/` est
versionné et que l'ETL tourne donc sans réseau.

## Vérifier

`npm run verifier` — lint (Biome), typecheck, knip, tests. Il n'y a pas de build.

## Tests

**Sans mock** : lecture de vrais bundles FHIR, aller-retour CSV RFC 4180, calcul
de marts en mémoire. Aucune donnée réelle dans les fixtures.

## Dette nommée

`Csv`, `Xlsx`, `Paths` et `Mapping` sont des classes à membres uniquement
statiques — Biome le signale (`noStaticOnlyClass`, en avertissement). Ce sont des
modules déguisés en classes ; le convertir en fonctions exportées touche une
centaine d'appels. **À payer quand un de ces modules sera rouvert**, pas avant,
et pas par un `off` dans la configuration.

`noNonNullAssertion` est éteinte dans `src/` pour une raison précise : le
tsconfig active `noUncheckedIndexedAccess`, qui rend `ligne[colonne]`
potentiellement `undefined`. C'est la garantie forte, on la garde ; le `!` en est
le prix sur une colonne qu'on vient de lire dans l'en-tête. On éteint la règle
faible pour tenir la forte, pas l'inverse.
