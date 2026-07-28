# data-analyzer — ETL « part des trajets via les plateformes »

ETL versionné calculant la **part des trajets réalisés via les plateformes** (numérateur),
rapportée au **référentiel national de remboursement** (dénominateur), par établissement /
GHT × année × type de transport × enveloppe.

> **Code public, données et fournisseurs privés.** Le code de l'ETL est générique : il ne
> connaît que des **rôles** (`plateforme`, `referentiel-national`, `referentiel-ght`) et des
> **formats de fichier**, jamais l'identité d'un fournisseur ni la moindre donnée. L'association
> entre les fichiers réels (et leurs fournisseurs) et ces formats/rôles vit dans `mapping.json`,
> **non versionné**. Voir [Confidentialité](#confidentialité).

Spec de cadrage : [`docs/specs/etl-part-plateformes.md`](../../docs/specs/etl-part-plateformes.md).

Deux publics : les **analystes** qui consomment les marts liront [Livrables](#livrables-marts)
et [Points d'attention métier](#points-dattention-métier) ; les **développeurs** qui font
tourner ou étendent l'ETL, les sections suivantes.

---

## Livrables (marts)

Chaque mart est le **même calcul à un grain différent**, sur des trajets **réconciliés**
(ré-clés sur l'autorité du référentiel puis rattachés au GHT — voir [Pipeline](#pipeline--artefacts)
et le [point 1](#1-divergence-dattribution-entre-sources--cellules-part--1-exposées-non-corrigées)).

| Livrable | Grain | À savoir / limite |
|---|---|---|
| `mart_geographique.csv` | finess **géographique** | Le plus fin, mais **beaucoup de `part` NULL** : le référentiel n'a pas toujours de valeur sur *le même site* que la plateforme (dénominateur absent). Exclut les sources sans finess géographique. |
| `mart_juridique.csv` | finess **juridique** (autorité référentiel) | Livrable établissement principal. Résidu de `part>1` (divergence réelle entre les deux systèmes, cf. point 1). |
| `mart_ght.csv` | **GHT** | **Le plus fiable** : les désaccords d'attribution intra-GHT se réconcilient (quasi 0 `part>1`). Couvre les établissements **publics en GHT** (cf. point 2) **et** la plateforme au niveau GHT (cf. point 6). |
| `mart_hors_ght.csv` | finess **juridique**, hors GHT | Complément de `mart_ght` : les établissements **sans GHT** (~91 % : cliniques privées, imagerie…). |
| `mart_article80.csv` | juridique **et** GHT | **Volumes + part par plateforme** (pas de ratio national, cf. point 3). Colonne `grain` = `juridique`/`ght`. |
| `mart_ght_2024.csv` | **GHT**, année 2024, **tous transports** | **Rollup du mart GHT** : une ligne par GHT (136), somme des véhicules pour 2024. Colonnes `nb_plateforme`, `nb_cnam` (= référentiel CNAM), `ratio = nb_plateforme / nb_cnam`. Vue de synthèse « taux réel de recours aux plateformes par GHT ». |

**Colonnes des marts « ratio »** (`geographique`, `juridique`, `ght`, `hors_ght`) :
`… annee, vehicule, nb_plateforme, nb_reference, part, alerte_qualite`, avec

- `part = nb_plateforme / nb_reference` (hors Article 80), **vide (NULL)** si pas de dénominateur ;
- `alerte_qualite = "part>1"` quand le numérateur dépasse le dénominateur (signal assumé, non corrigé).

`mart_article80` porte à la place `nb` et `part_plateforme = source / Σ plateformes`.
Nomenclature véhicule canonique : `vehicule ∈ {Ambulance, Assis, Autre, Total}`.

## Points d'attention métier

À lire avant d'interpréter les marts. Ces points ne sont pas des bugs mais des propriétés de
la donnée ou des règles de gestion assumées ; plusieurs demandent un arbitrage du porteur.

### 1. Divergence d'attribution entre sources ⇒ cellules `part > 1` (exposées, non corrigées)

Les deux systèmes rangent parfois le *même trajet réel* sous des finess **différents** (la
plateforme dit « site → groupe A », le référentiel « site → groupe B »). `reconcile` ré-clé
donc les trajets sur **l'autorité du référentiel** (le finess juridique que le référentiel
associe au site géographique, pas celui déclaré par la source). Les deux plateformes à finess
fournissent bien un finess **géographique** (~99 % des lignes ; l'idée répandue « plateforme A
sans géo » est **fausse** sur la donnée réelle).

Ce ré-clé **répare les cas spectaculaires** (réseaux nationaux), mais ne fait **pas** tomber
`part>1` à zéro : deux systèmes indépendants ne s'emboîtent jamais parfaitement (périmètre,
calendrier, reclassement véhicule). Le résidu est **assumé et exposé** via `alerte_qualite`,
jamais plafonné ni supprimé.

Effet du grain (contre-intuitif) : **plus le grain est fin, plus il y a de `part>1`** — la
comparaison au grain géographique en produit le plus, le grain GHT le moins (les désaccords
intra-GHT se réconcilient). C'est pourquoi `mart_ght` est le livrable le plus fiable.

### 2. Le GHT ne couvre que les **hôpitaux publics** ⇒ ~91 % des finess non rattachés

Un GHT regroupe uniquement des établissements **publics** (888 finess juridiques / 135 GHT ;
cf. [Référentiels](#référentiels-ref)). Or les transports remboursés concernent aussi les
**cliniques privées, centres d'imagerie, etc.**, hors GHT. Résultat : seuls **≈ 9 %** des finess
juridiques de nos sources (≈ 840 sur ~8 400) se rattachent à un GHT ; **~91 % n'en ont aucun**.
`mart_ght` ne couvre donc que ce **sous-ensemble public**. **À trancher avec le porteur** :
périmètre « public en GHT » seulement, ou prévoir un regroupement « hors GHT » à côté ?

### 3. Article 80 : dénominateur = 100 % **par construction** → `mart_article80` dédié

Le remboursement national ne couvre **pas** l'Article 80 ⇒ pas de source indépendante donnant
le total art. 80. Un ratio « via plateforme » vaudrait trivialement **100 %**. L'information
utile est donc le **volume** et la **part de chaque plateforme** dans ce total : c'est l'objet
du livrable séparé `mart_article80.csv`. Les quatre marts « ratio » restent, eux, **hors Article 80**.

### 4. Fenêtre du dénominateur : `part = NULL` hors 2024-2025

Le référentiel national ne couvre que **2024-2025** (hors art. 80), alors que les plateformes
remontent dès 2020. Toute cellule plateforme hors de cette fenêtre a **`part` NULL** — tracée,
pas supprimée (le numérateur reste visible). Acceptable ? à confirmer.

### 5. Nomenclature véhicule volontairement **grossière**

La plateforme B ne fournit que « TAP » (assis, non décomposable en taxi/VSL). La seule
granularité **commune à toutes les sources** est donc **Ambulance / Assis / Autre** (+ `Total`
pour l'art. 80 des plateformes au niveau GHT). C'est ce grain canonique qui garantit la
comparabilité numérateur ↔ dénominateur ; le détail fin (taxi/VSL) pourra venir en itération.

### 6. Plateforme au niveau GHT (sans finess) — cas particuliers

La plateforme qui remonte au niveau GHT est rattachée par un mapping manuel (mécanique décrite
dans [Référentiels](#référentiels-ref)). Trois conséquences à connaître à la lecture des marts :

- **Millésime 2018** du référentiel finess → GHT (carte des 135 GHT stable depuis 2016, mais des
  fusions ont pu bouger) : les finess non reconnus sont **signalés** par `reconcile`, pas inventés.
- **AP-HP** (~18 % du volume de cette plateforme) n'est pas dans les 135 GHT open data, mais le
  référentiel porte les trajets de ses ~59 sites : traitée comme un **GHT à part entière**, elle a
  un **vrai dénominateur** → `part` calculable (ex. 2024 Ambulance ≈ 0,07).
- **FOCH** (ESPIC) et **CGFL Dijon** (centre anti-cancer) ne sont **pas membres** d'un GHT ; choix
  de gestion assumé : rattachés **par territoire**. ⚠️ Leur volume plateforme **gonfle le
  numérateur** du GHT d'accueil sans dénominateur en face → peut tirer la `part` vers le haut. De
  même, un `part>1` apparaît si le périmètre « GHT » de la plateforme dépasse le GHT officiel
  (observé : **GHT Vendée**, `part ≈ 2,9`) — exposé via `alerte_qualite`, à investiguer.

### 7. Établissements hors GHT rattachés **par territoire**

Certains établissements présents dans les sources **plateforme au niveau finess** ne sont
**membres d'aucun** des 135 GHT — non par oubli, mais par **construction** : les **CLCC** (centres
de lutte contre le cancer, privés à but non lucratif), les **EFS** (établissements de transfusion
sanguine) et les établissements **d'outre-mer** échappent au découpage GHT métropolitain. Plutôt
que de les laisser sans rattachement (et donc invisibles dans `mart_ght`), ils sont rattachés
**au GHT de leur territoire de santé** via `ref/finess-ght-manuel.csv` :

| Finess | Établissement | Territoire | GHT retenu (le plus proche) |
|---|---|---|---|
| 630781110 | CLCC Jean Perrin | Clermont-Ferrand (63) | `ght-ARA-01` — GHT Territoire d'Auvergne |
| 130784127 | Institut Paoli-Calmettes (CLCC) | Marseille (13) | `ght-PACA-04` — GHT Bouches-du-Rhône |
| 930019229 | EFS Centre–Pays de la Loire | Le Mans (72) | `ght-PDL-04` — GHT Sarthe |
| 970211207 | CHU de Martinique | Martinique (972) | `ght-MAR-01` — GHT Centre Sud |

Ces quatre rattachements sont **sans ambiguïté** : l'établissement est sur le **même territoire
de santé** que le GHT retenu. Comme pour FOCH/CGFL ([point 6](#6-plateforme-au-niveau-ght-sans-finess--cas-particuliers)),
ils **gonflent le numérateur** du GHT d'accueil sans dénominateur en face (ces établissements ne
sont pas dans le référentiel national du GHT) → peuvent tirer la `part` vers le haut.

**Cas exclu — CH de Cayenne (970302022, Guyane).** La **Guyane n'a aucun GHT** dans l'open data,
et le GHT le plus proche traverse **~1 400 km d'océan** (Martinique ou Guadeloupe, quasi
équidistantes) : aucun « territoire de santé » commun ne justifie un rattachement. Le forcer vers
un GHT antillais serait un **artefact géographique** qui fausserait sa `part`. Il est donc
**laissé hors GHT** : ses trajets restent visibles dans `mart_juridique` / `mart_geographique` /
`mart_hors_ght`, mais **pas dans `mart_ght`**. À rouvrir avec le porteur si un rattachement
outre-mer devient pertinent (il suffit d'ajouter une ligne à `ref/finess-ght-manuel.csv`).

---

## Lancer

```bash
npm install
cp mapping.example.json mapping.json   # puis renseigner vos fichiers (voir ci-dessous)
npm run etl        # enchaîne les 4 étapes ; régénère build/
# ou étape par étape :
npm run extract && npm run staging && npm run reconcile && npm run marts
npm test           # tests unitaires (vitest)
npm run publish-grist  # optionnel : publie les marts dans Grist (voir Publication)
```

Node 24 (exécution TypeScript native, aucun build). SheetJS pour les `.xlsx`. **Aucune étape
réseau** : tous les référentiels publics sont versionnés dans `ref/`. `npm run fetch-ght` ne
sert qu'à **rafraîchir** le référentiel GHT commité (`ref/ght/`) — pas nécessaire au fonctionnement.

## Configuration des entrées — `mapping.json`

`mapping.json` (non versionné ; gabarit : `mapping.example.json`) déclare chaque fichier
d'entrée : son emplacement, son **rôle** et son **format**. L'ETL se comporte de manière
générique quels que soient les fichiers fournis.

```json
[
  {
    "role": "referentiel-national",
    "format": "referentiel-remboursement-xlsx",
    "location": "data/reference-nationale.xlsx",
    "label": "reference-1"
  },
  {
    "role": "plateforme",
    "format": "plateforme-finess-tsv",
    "location": "data/plateforme-a.csv",
    "label": "plateforme-a",
    "options": { "colFinessJuridique": 1, "colFinessGeographique": 0 }
  }
]
```

- **`role`** — `referentiel-national` (dénominateur, hors art. 80), `plateforme` (numérateur)
  ou `referentiel-ght` (rattachement finess → GHT open data ; cf. [Référentiels](#référentiels-ref)).
- **`format`** — un adaptateur enregistré (`src/01-extract/adapteurs/registry.ts`) :
  `referentiel-remboursement-xlsx`, `plateforme-finess-tsv`, `plateforme-finess-xlsx`,
  `plateforme-ght-xlsx`, `ght-fhir-datagouv` (dont la `location` est le **dossier** `ref/ght/`).
  Le format `plateforme-finess-xlsx` (établissement, en-têtes multi-niveaux, une colonne par
  année) porte l'art. 80 en total et le hors art. 80 en détail partiel (taxi/VSL/ambulance) ;
  le reliquat `total − détail` est imputé à `Autre` pour boucler le total annoncé.
- **`location`** — chemin du fichier (absolu ou relatif à la racine de l'app).
- **`label`** — identifiant neutre, unique (nomme les artefacts de traçabilité).
- **`options`** — paramètres propres au format (ex. index de colonnes finess pour le TSV),
  ce qui permet à plusieurs fichiers de partager un même adaptateur.

Une entrée invalide (rôle/format/location/label manquant, format inconnu) fait échouer
l'ETL avec un message explicite.

## Pipeline & artefacts

Une étape = une source de complexité. Toute la connaissance propre à une source (format,
colonnes, vocabulaire véhicule) est encapsulée dans son **adaptateur** ; les étapes suivantes
sont entièrement génériques et ne raisonnent que sur les rôles.

| Étape | Responsabilité | Entrée → sortie |
|---|---|---|
| `extract`   | appliquer à chaque fichier l'**adaptateur de son format** → lignes normalisées (rôle + nomenclature canonique) | `mapping.json`, sources → `build/extract/` |
| `staging`   | **réunir** les sources et **agréger** au grain canonique | `build/extract/trajets/` → `build/staging/trajets.csv` |
| `reconcile` | poser les **clés** : dimension établissements ; **ré-clé** des trajets sur l'autorité du référentiel ; rattachement au GHT | `build/extract/`, `build/staging/` → `build/reconcile/` |
| `marts`     | appliquer les **règles de calcul** (part / volumes), à chaque grain | `build/reconcile/` → `build/marts/` |

| Artefact | Étape | Description | Colonnes |
|---|---|---|---|
| `build/extract/trajets/<label>.csv` | extract | Trajets d'une source, décodés et normalisés. | `role, source, finess_juridique, finess_geographique, ght_libelle, enveloppe, annee, vehicule_canonique, nb_trajets` |
| `build/extract/etablissements.csv` | extract | Identité des établissements (émise par les référentiels), un par site. | `finess_juridique, finess_geographique, nom, ville, departement, categorie, score` |
| `build/extract/ght.csv` | extract | Rattachement finess juridique → GHT, dérivé des bundles `ref/ght/`. | `finess_juridique, ght_code, ght_libelle, region, raison_sociale` |
| `build/staging/trajets.csv` | staging | Toutes les sources réunies et agrégées au grain canonique. | idem `trajets/<label>.csv` |
| `build/reconcile/etablissements.csv` | reconcile | Libellé représentatif de chaque établissement, pour habiller les marts. | `finess_juridique, nom, ville, departement, categorie` |
| `build/reconcile/trajets.csv` | reconcile | Trajets **ré-clés** (autorité référentiel) et **rattachés au GHT**. Base commune des marts. | idem staging + `ght_code` |
| `build/marts/mart_*.csv` | marts | Les **6 [livrables](#livrables-marts)** (dont `mart_ght_2024`, rollup dérivé de `mart_ght`). | selon le mart |

## Publication (dataviz)

Étape **optionnelle**, hors des 4 étapes ETL et **seule étape réseau** (en écriture) : pousse les
marts dans **Grist** pour les explorer et bâtir la dataviz. But premier : révéler le **taux réel
de recours aux plateformes par GHT** (`Mart_Ght`, colonne `part` ; `Mart_Ght_2024`, colonne `ratio`).

```bash
npm run publish-grist              # tous les marts publiables
npm run publish-grist -- ght_2024  # un seul (par son nom court)
```

Config (env ; `.env` lu automatiquement s'il existe, sinon variables du shell) :

| Variable | Rôle |
|---|---|
| `GRIST_DOC_URL` | Base API du doc **dédié dataviz** (≠ doc d'identification), ex. `https://…/api/docs/<docId>` |
| `GRIST_API_KEY` | Clé API Grist |

Chaque mart publiable déclare sa table et ses colonnes dans `MARTS` (`src/05-publish/publish.ts`) ;
**ajouter un mart = ajouter une entrée**. Pour chacun, la publication **garantit** la table (la crée
avec ses colonnes si absente, complète les colonnes manquantes) puis **remplace** tout son contenu
(vide + réinsère). Sémantique de **snapshot** : idempotent, sans lignes périmées — relançable après
chaque `npm run marts`.

| Mart | Table Grist |
|---|---|
| `mart_ght.csv` (`ght`) | `Mart_Ght` |
| `mart_ght_2024.csv` (`ght_2024`) | `Mart_Ght_2024` |
| `mart_juridique.csv` (`juridique`) | `Mart_Juridique` |
| `mart_geographique.csv` (`geographique`) | `Mart_Geographique` |
| `mart_hors_ght.csv` (`hors_ght`) | `Mart_Hors_Ght` |
| `mart_article80.csv` (`article80`) | `Mart_Article80` |

⚠️ Le mart contient de **vrais établissements** (cf. [Confidentialité](#confidentialité)) : le
doc Grist cible doit rester **privé**.

## Référentiels (`ref/`)

`ref/` ne contient que des référentiels **publics et non identifiants**, versionnés pour la
reproductibilité (open data figé + mappings manuels relus par le porteur). Ils ne portent que
des noms d'établissements/GHT **publics** — aucune donnée ni identité de fournisseur.

| Fichier | Rôle | Colonnes | Jointure `reconcile` | Contenu |
|---|---|---|---|---|
| `ght/*.json` | Référentiel **finess → GHT** open data (source `referentiel-ght`). | — (FHIR) | via l'adaptateur `ght-fhir-datagouv` → `build/extract/ght.csv` | 135 bundles FHIR data.gouv `etablissements-de-sante-par-ght` (ODbL), 1 par GHT, ~24 Mo. Rattache **888 finess juridiques à 135 GHT**. `npm run fetch-ght` les rafraîchit. |
| `plateforme-ght-mapping.csv` | Rattache les **libellés GHT libres** de la plateforme au niveau GHT (sans finess) à un GHT. | `libelle, ght_code, ght_officiel` | sur `libelle` (nettoyé de ses notes entre parenthèses) | 23 entrées ; un fuzzy match pré-remplit, la table relue **fait foi**. |
| `finess-ght-manuel.csv` | Overrides **finess juridique → GHT**, fusionnés par-dessus l'open data pour les entités hors référentiel. | `finess_juridique, ght_code, ght_officiel` | sur `finess_juridique` | L'**AP-HP** (750712184 → `AP-HP`, GHT à part entière) ; et **4 établissements structurellement hors des 135 GHT** (CLCC, EFS, Martinique) rencontrés dans les sources plateforme, rattachés au **GHT de leur territoire** (cf. [point 7](#7-établissements-hors-ght-rattachés-par-territoire), qui documente aussi le CH de Cayenne, laissé **hors GHT**). |

Conséquences métier de ces rattachements manuels (AP-HP, FOCH, CGFL, millésime) : voir
[point 6](#6-plateforme-au-niveau-ght-sans-finess--cas-particuliers) ; rattachements par
territoire des établissements hors GHT : [point 7](#7-établissements-hors-ght-rattachés-par-territoire).

## Confidentialité

Le monorepo est public ; les données et l'identité des fournisseurs ne le sont pas.

- **Jamais versionnés** : `data/` (sources brutes) ; `build/` (tous les artefacts, dont le mart
  qui contient de vrais établissements) ; `mapping.json` (lie fichiers réels + fournisseurs aux
  formats/rôles).
- **Versionnés** (publics, non identifiants) : `src/` (code générique), `ref/` (open data figé
  `ref/ght/` + mappings manuels), `mapping.example.json` (gabarit neutre).
- **Publication Grist** (cf. [Publication](#publication-dataviz)) : les marts publiés contiennent
  de vrais établissements ⇒ le doc cible doit rester **privé**, et sa clé (`GRIST_API_KEY`) hors
  du dépôt (`.env` non versionné).

Les libellés de véhicule et noms de colonnes des adaptateurs décrivent des **formats**, pas des
fournisseurs. Comme `ref/` est versionné, l'ETL tourne sans étape réseau.
