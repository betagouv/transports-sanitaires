# data-analyzer — ETL « part des trajets via les plateformes »

ETL versionné qui calcule la part des trajets réalisés via les plateformes, au numérateur,
rapportée au référentiel national de remboursement, au dénominateur. Le résultat est
ventilé par établissement ou GHT, par année, par type de transport et par enveloppe.

> **Code public, données et fournisseurs privés.** Le code de l'ETL est générique : il ne
> connaît que des rôles (`plateforme`, `referentiel-national`, `referentiel-ght`) et des
> formats de fichier, jamais l'identité d'un fournisseur ni la moindre donnée.
> L'association entre les fichiers réels, avec leurs fournisseurs, et ces formats et rôles
> vit dans `mapping.json`, qui n'est pas versionné. Voir
> [Confidentialité](#confidentialité).

Spec de cadrage : [`docs/specs/etl-part-plateformes.md`](../../docs/specs/etl-part-plateformes.md).

Ce document sert deux publics. Les analystes qui consomment les marts liront
[Livrables](#livrables-marts) et [Points d'attention métier](#points-dattention-métier).
Les développeurs qui font tourner ou étendent l'ETL liront les sections suivantes.

---

## Livrables (marts)

Chaque mart est le même calcul à un grain différent, sur des trajets réconciliés,
c'est-à-dire ré-clés sur l'autorité du référentiel puis rattachés au GHT. Voir
[Pipeline](#pipeline--artefacts) et le
[point 1](#1-divergence-dattribution-entre-sources-et-cellules-part--1).

| Livrable | Grain | À savoir / limite |
|---|---|---|
| `mart_geographique.csv` | finess **géographique** | Le plus fin, mais **beaucoup de `part` NULL** : le référentiel n'a pas toujours de valeur sur *le même site* que la plateforme (dénominateur absent). Exclut les sources sans finess géographique. |
| `mart_juridique.csv` | finess **juridique** (autorité référentiel) | Livrable établissement principal. Résidu de `part>1` (divergence réelle entre les deux systèmes, cf. point 1). |
| `mart_ght.csv` | **GHT** | **Le plus fiable** : les désaccords d'attribution intra-GHT se réconcilient (quasi 0 `part>1`). Couvre les établissements **publics en GHT** (cf. point 2) **et** la plateforme au niveau GHT (cf. point 6). |
| `mart_hors_ght.csv` | finess **juridique**, hors GHT | Complément de `mart_ght` : les établissements **sans GHT** (~91 % : cliniques privées, imagerie…). |
| `mart_article80.csv` | juridique **et** GHT | **Volumes + part par plateforme** (pas de ratio national, cf. point 3). Colonne `grain` = `juridique`/`ght`. |
| `mart_ght_2024.csv` | **GHT**, année 2024, **tous transports** | **Rollup du mart GHT** : une ligne par GHT (136), somme des véhicules pour 2024. Colonnes `nb_plateforme`, `nb_cnam` (= référentiel CNAM), `ratio = nb_plateforme / nb_cnam`. Vue de synthèse « taux réel de recours aux plateformes par GHT ». |

Les marts de ratio — `geographique`, `juridique`, `ght` et `hors_ght` — portent les
colonnes `… annee, vehicule, nb_plateforme, nb_reference, part, alerte_qualite`, où :

- `part = nb_plateforme / nb_reference`, hors Article 80, et reste vide, donc NULL, s'il
  n'y a pas de dénominateur ;
- `alerte_qualite = "part>1"` quand le numérateur dépasse le dénominateur. C'est un signal
  assumé, qu'on ne corrige pas.

`mart_article80` porte à la place `nb` et `part_plateforme = source / Σ plateformes`. La
nomenclature véhicule canonique est `vehicule ∈ {Ambulance, Assis, Autre, Total}`.

## Points d'attention métier

À lire avant d'interpréter les marts. Ces points ne sont pas des bugs, mais des propriétés
de la donnée ou des règles de gestion assumées. Plusieurs demandent un arbitrage du
porteur.

### 1. Divergence d'attribution entre sources, et cellules `part > 1`

Elles sont exposées et non corrigées.

Les deux systèmes rangent parfois le *même trajet réel* sous des finess différents : la
plateforme rattache un site au groupe A, le référentiel au groupe B. `reconcile` ré-clé
donc les trajets sur l'autorité du référentiel, en retenant le finess juridique que le
référentiel associe au site géographique, et non celui déclaré par la source. Les deux
plateformes à finess fournissent bien un finess géographique, sur environ 99 % des lignes.
L'idée répandue d'une plateforme A sans géo est fausse sur la donnée réelle.

Ce ré-clé répare les cas spectaculaires, ceux des réseaux nationaux, mais ne fait pas
tomber `part>1` à zéro. Deux systèmes indépendants ne s'emboîtent jamais parfaitement,
pour des raisons de périmètre, de calendrier et de reclassement de véhicule. Le résidu est
assumé et exposé par `alerte_qualite`, jamais plafonné ni supprimé.

L'effet du grain est contre-intuitif : plus le grain est fin, plus il y a de `part>1`. La
comparaison au grain géographique en produit le plus, celle au grain GHT le moins, les
désaccords intra-GHT s'y réconciliant. C'est pourquoi `mart_ght` est le livrable le plus
fiable.

### 2. Le GHT ne couvre que les hôpitaux publics

Environ 91 % des finess ne sont donc rattachés à aucun GHT.

Un GHT regroupe uniquement des établissements publics : 888 finess juridiques et 135 GHT,
cf. [Référentiels](#référentiels-ref). Or les transports remboursés concernent aussi les
cliniques privées, les centres d'imagerie et d'autres établissements hors GHT. Seuls
environ 9 % des finess juridiques de nos sources, à peu près 840 sur 8 400, se rattachent
donc à un GHT, et environ 91 % n'en ont aucun. `mart_ght` ne couvre que ce sous-ensemble
public. **À trancher avec le porteur** : garde-t-on le seul périmètre public en GHT, ou
prévoit-on un regroupement hors GHT à côté ?

### 3. Article 80 : un dénominateur à 100 % par construction

C'est ce qui justifie le `mart_article80` dédié.

Le remboursement national ne couvre pas l'Article 80, donc aucune source indépendante ne
donne le total article 80. Un ratio « via plateforme » vaudrait trivialement 100 %.
L'information utile est donc le volume et la part de chaque plateforme dans ce total,
c'est l'objet du livrable séparé `mart_article80.csv`. Les quatre marts de ratio restent,
eux, hors Article 80.

### 4. Fenêtre du dénominateur : `part = NULL` hors 2024-2025

Le référentiel national ne couvre que 2024 et 2025, hors article 80, alors que les
plateformes remontent dès 2020. Toute cellule plateforme hors de cette fenêtre a une
`part` à NULL. Elle est tracée et non supprimée, le numérateur restant visible. Est-ce
acceptable ? À confirmer.

### 5. Nomenclature véhicule volontairement grossière

La plateforme B ne fournit que « TAP », de l'assis qu'on ne peut pas décomposer entre taxi
et VSL. La seule granularité commune à toutes les sources est donc Ambulance, Assis et
Autre, auxquels s'ajoute `Total` pour l'article 80 des plateformes au niveau GHT. C'est ce
grain canonique qui garantit la comparabilité entre numérateur et dénominateur ; le détail
fin, taxi contre VSL, pourra venir en itération.

### 6. Plateforme au niveau GHT (sans finess), et ses cas particuliers

La plateforme qui remonte au niveau GHT est rattachée par un mapping manuel, dont la
mécanique est décrite dans [Référentiels](#référentiels-ref). Trois conséquences sont à
connaître à la lecture des marts :

- Le référentiel finess vers GHT est au **millésime 2018**. La carte des 135 GHT est
  stable depuis 2016, mais des fusions ont pu bouger. Les finess non reconnus sont
  signalés par `reconcile`, jamais inventés.
- L'**AP-HP**, environ 18 % du volume de cette plateforme, n'est pas dans les 135 GHT open
  data, mais le référentiel porte les trajets de ses quelque 59 sites. Elle est donc
  traitée comme un GHT à part entière et a un vrai dénominateur, ce qui rend sa `part`
  calculable — environ 0,07 pour l'Ambulance en 2024.
- **FOCH**, un ESPIC, et **CGFL Dijon**, un centre anti-cancer, ne sont membres d'aucun
  GHT. Le choix de gestion, assumé, est de les rattacher par territoire. ⚠️ Leur volume
  plateforme gonfle alors le numérateur du GHT d'accueil sans dénominateur en face, ce qui
  peut tirer la `part` vers le haut. De même, un `part>1` apparaît si le périmètre « GHT »
  de la plateforme dépasse le GHT officiel : c'est le cas observé du GHT Vendée, à
  `part ≈ 2,9`. C'est exposé par `alerte_qualite`, et à investiguer.

### 7. Établissements hors GHT rattachés par territoire

Certains établissements présents dans les sources plateforme au niveau finess ne sont
membres d'aucun des 135 GHT, non par oubli mais par construction. Les CLCC, centres de
lutte contre le cancer privés à but non lucratif, les EFS, établissements de transfusion
sanguine, et les établissements d'outre-mer échappent au découpage GHT métropolitain.
Plutôt que de les laisser sans rattachement, donc invisibles dans `mart_ght`, on les
rattache au GHT de leur territoire de santé via `ref/finess-ght-manuel.csv` :

| Finess | Établissement | Territoire | GHT retenu (le plus proche) |
|---|---|---|---|
| 630781110 | CLCC Jean Perrin | Clermont-Ferrand (63) | `ght-ARA-01` — GHT Territoire d'Auvergne |
| 130784127 | Institut Paoli-Calmettes (CLCC) | Marseille (13) | `ght-PACA-04` — GHT Bouches-du-Rhône |
| 930019229 | EFS Centre–Pays de la Loire | Le Mans (72) | `ght-PDL-04` — GHT Sarthe |
| 970211207 | CHU de Martinique | Martinique (972) | `ght-MAR-01` — GHT Centre Sud |

Ces quatre rattachements sont sans ambiguïté : l'établissement est sur le même territoire
de santé que le GHT retenu. Comme pour FOCH et CGFL
([point 6](#6-plateforme-au-niveau-ght-sans-finess-et-ses-cas-particuliers)), ils gonflent
le numérateur du GHT d'accueil sans dénominateur en face, ces établissements n'étant pas
dans le référentiel national du GHT, et peuvent donc tirer la `part` vers le haut.

**Un cas est exclu, le CH de Cayenne (970302022, Guyane).** La Guyane n'a aucun GHT dans
l'open data, et le GHT le plus proche se trouve à quelque 1 400 km d'océan, en Martinique
ou en Guadeloupe, presque équidistantes. Aucun territoire de santé commun ne justifie un
rattachement, et le forcer vers un GHT antillais serait un artefact géographique qui
fausserait sa `part`. Il est donc laissé hors GHT : ses trajets restent visibles dans
`mart_juridique`, `mart_geographique` et `mart_hors_ght`, mais pas dans `mart_ght`. À
rouvrir avec le porteur si un rattachement outre-mer devient pertinent, ce qui ne demande
qu'une ligne de plus dans `ref/finess-ght-manuel.csv`.

---

## Lancer

```bash
pnpm install           # installe les trois apps du dépôt, où qu'on le lance
cp mapping.example.json mapping.json   # puis renseigner vos fichiers (voir ci-dessous)
pnpm etl               # enchaîne les 4 étapes ; régénère build/
# ou étape par étape :
pnpm extract && pnpm staging && pnpm reconcile && pnpm marts
pnpm test              # tests unitaires (vitest)
pnpm publish-grist     # optionnel : publie les marts dans Grist (voir Publication)
```

Node 24 exécute le TypeScript nativement, il n'y a aucun build. SheetJS lit les `.xlsx`. Il
n'y a aucune étape réseau : tous les référentiels publics sont versionnés dans `ref/`.
`pnpm fetch-ght` ne sert qu'à rafraîchir le référentiel GHT commité dans `ref/ght/`, et
n'est pas nécessaire au fonctionnement.

## Configuration des entrées — `mapping.json`

`mapping.json`, qui n'est pas versionné et dont le gabarit est `mapping.example.json`,
déclare chaque fichier d'entrée : son emplacement, son rôle et son format. L'ETL se
comporte de manière générique quels que soient les fichiers fournis.

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

- **`role`** vaut `referentiel-national` pour le dénominateur hors article 80, `plateforme`
  pour le numérateur, ou `referentiel-ght` pour le rattachement finess vers GHT en open
  data, cf. [Référentiels](#référentiels-ref).
- **`format`** nomme un adaptateur enregistré dans
  `src/01-extract/adapteurs/registry.ts` : `referentiel-remboursement-xlsx`,
  `plateforme-finess-tsv`, `plateforme-finess-xlsx`, `plateforme-ght-xlsx` ou
  `ght-fhir-datagouv`, ce dernier ayant pour `location` le dossier `ref/ght/`. Le format
  `plateforme-finess-xlsx`, au grain établissement, avec des en-têtes multi-niveaux et une
  colonne par année, porte l'article 80 en total et le hors article 80 en détail partiel,
  taxi, VSL et ambulance. Le reliquat, la différence entre le total et le détail, est
  imputé à `Autre` pour boucler le total annoncé.
- **`location`** est le chemin du fichier, absolu ou relatif à la racine de l'app.
- **`label`** est un identifiant neutre et unique, qui nomme les artefacts de traçabilité.
- **`options`** porte les paramètres propres au format, par exemple les index de colonnes
  finess pour le TSV. C'est ce qui permet à plusieurs fichiers de partager un adaptateur.

Une entrée invalide, à laquelle il manque le rôle, le format, la location ou le label, ou
dont le format est inconnu, fait échouer l'ETL avec un message explicite.

## Pipeline & artefacts

Une étape correspond à une source de complexité. Toute la connaissance propre à une
source, son format, ses colonnes et son vocabulaire véhicule, est encapsulée dans son
adaptateur. Les étapes suivantes sont entièrement génériques et ne raisonnent que sur les
rôles.

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

C'est une étape optionnelle, hors des 4 étapes de l'ETL, et la seule étape réseau, en
écriture. Elle pousse les marts dans Grist pour les explorer et bâtir la dataviz. Son but
premier est de révéler le taux réel de recours aux plateformes par GHT, dans la colonne
`part` de `Mart_Ght` et la colonne `ratio` de `Mart_Ght_2024`.

```bash
pnpm publish-grist            # tous les marts publiables
pnpm publish-grist ght_2024   # un seul (par son nom court)
```

La configuration passe par l'environnement. Un `.env` est lu automatiquement s'il existe,
sinon on prend les variables du shell.

| Variable | Rôle |
|---|---|
| `GRIST_DOC_URL` | Base API du doc **dédié dataviz** (≠ doc d'identification), ex. `https://…/api/docs/<docId>` |
| `GRIST_API_KEY` | Clé API Grist |

Chaque mart publiable déclare sa table et ses colonnes dans `MARTS`
(`src/05-publish/publish.ts`) : ajouter un mart revient à ajouter une entrée. Pour chacun,
la publication garantit la table, en la créant avec ses colonnes si elle est absente et en
complétant les colonnes manquantes, puis remplace tout son contenu, en le vidant et en
réinsérant. La sémantique est celle d'un snapshot : idempotente, sans lignes périmées, et
relançable après chaque `pnpm marts`.

| Mart | Table Grist |
|---|---|
| `mart_ght.csv` (`ght`) | `Mart_Ght` |
| `mart_ght_2024.csv` (`ght_2024`) | `Mart_Ght_2024` |
| `mart_juridique.csv` (`juridique`) | `Mart_Juridique` |
| `mart_geographique.csv` (`geographique`) | `Mart_Geographique` |
| `mart_hors_ght.csv` (`hors_ght`) | `Mart_Hors_Ght` |
| `mart_article80.csv` (`article80`) | `Mart_Article80` |

⚠️ Le mart contient de vrais établissements, cf. [Confidentialité](#confidentialité) : le
doc Grist cible doit rester privé.

## Référentiels (`ref/`)

`ref/` ne contient que des référentiels publics et non identifiants, versionnés pour la
reproductibilité : de l'open data figé et des mappings manuels relus par le porteur. Ils ne
portent que des noms d'établissements et de GHT publics, aucune donnée ni identité de
fournisseur.

| Fichier | Rôle | Colonnes | Jointure `reconcile` | Contenu |
|---|---|---|---|---|
| `ght/*.json` | Référentiel **finess → GHT** open data (source `referentiel-ght`). | — (FHIR) | via l'adaptateur `ght-fhir-datagouv` → `build/extract/ght.csv` | 135 bundles FHIR data.gouv `etablissements-de-sante-par-ght` (ODbL), 1 par GHT, ~24 Mo. Rattache **888 finess juridiques à 135 GHT**. `pnpm fetch-ght` les rafraîchit. |
| `plateforme-ght-mapping.csv` | Rattache les **libellés GHT libres** de la plateforme au niveau GHT (sans finess) à un GHT. | `libelle, ght_code, ght_officiel` | sur `libelle` (nettoyé de ses notes entre parenthèses) | 23 entrées ; un fuzzy match pré-remplit, la table relue **fait foi**. |
| `finess-ght-manuel.csv` | Overrides **finess juridique → GHT**, fusionnés par-dessus l'open data pour les entités hors référentiel. | `finess_juridique, ght_code, ght_officiel` | sur `finess_juridique` | L'**AP-HP** (750712184 → `AP-HP`, GHT à part entière) ; et **4 établissements structurellement hors des 135 GHT** (CLCC, EFS, Martinique) rencontrés dans les sources plateforme, rattachés au **GHT de leur territoire** (cf. [point 7](#7-établissements-hors-ght-rattachés-par-territoire), qui documente aussi le CH de Cayenne, laissé **hors GHT**). |

Les conséquences métier de ces rattachements manuels — AP-HP, FOCH, CGFL, millésime — sont
au [point 6](#6-plateforme-au-niveau-ght-sans-finess-et-ses-cas-particuliers). Les
rattachements par territoire des établissements hors GHT sont au
[point 7](#7-établissements-hors-ght-rattachés-par-territoire).

## Confidentialité

Le monorepo est public ; les données et l'identité des fournisseurs ne le sont pas.

- **Jamais versionnés** : `data/`, qui porte les sources brutes ; `build/`, c'est-à-dire
  tous les artefacts, dont le mart qui contient de vrais établissements ; et
  `mapping.json`, qui lie les fichiers réels et leurs fournisseurs aux formats et aux
  rôles.
- **Versionnés**, parce que publics et non identifiants : `src/`, le code générique,
  `ref/`, l'open data figé de `ref/ght/` et les mappings manuels, et
  `mapping.example.json`, le gabarit neutre.
- **Publication Grist**, cf. [Publication](#publication-dataviz) : les marts publiés
  contiennent de vrais établissements, donc le doc cible doit rester privé et sa clé
  `GRIST_API_KEY` hors du dépôt, dans un `.env` non versionné.

Les libellés de véhicule et les noms de colonnes des adaptateurs décrivent des formats, pas
des fournisseurs. Comme `ref/` est versionné, l'ETL tourne sans étape réseau.
