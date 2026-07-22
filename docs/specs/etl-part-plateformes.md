# Spec — ETL versionné : part des trajets réalisés via les plateformes

> Statut : **itération 1 réalisée** (mart_etablissement). Cadrage validé avec le porteur
> le 2026-07-22. Code : `apps/data-analyzer` (voir son README). Reste à faire :
> `mart_ght` (dépend du rattachement finess → GHT), et l'arbitrage du grain finess
> juridique (cf. « Limite connue » ci-dessous / README).

> **Confidentialité.** Le monorepo est public ; ni les données ni l'identité des
> fournisseurs ne le sont. Cette spec, comme le code, est **anonyme** : elle parle de
> **rôles** (`référentiel national`, `plateforme`) et de **formats de fichier**, jamais
> d'un fournisseur nommé. L'association entre fichiers réels et rôles/formats vit dans
> `mapping.json` (non versionné). Cf. §Confidentialité du README.

## Objectif

Pour chaque **établissement** (finess) et chaque **GHT**, connaître la **part des
trajets réalisés via les plateformes** (numérateur), rapportée au **référentiel national
de remboursement** (dénominateur), ventilée par :

- **année**,
- **type de transport** (véhicule),
- **enveloppe** (Article 80 / Hors Article 80).

L'ETL doit être **versionné** (git, sur `main`) et **évolutif** : intégrer une nouvelle
extraction (nouvelle année, nouvelle plateforme, référentiel mis à jour) sans réécriture,
en déclarant simplement le fichier dans `mapping.json`.

## Sources

Quatre fichiers d'entrée, décrits par leur **rôle** et leur **format** (structure publique,
non identifiante). Les plateformes A et B partagent un même format (adaptateur paramétré).

| Rôle | Format | Grain | Enveloppe | Années | Véhicules | Finess |
|---|---|---|---|---|---|---|
| référentiel national | `referentiel-remboursement-xlsx` — xlsx **double en-tête** (période × véhicule) | établissement | **Hors art. 80 uniquement** (le remboursement national ne couvre pas l'art. 80) | 2024, 2025 | Ambulance, VSL, TP_VSL, taxi, autre mode | juridique **et** géographique |
| plateforme A | `plateforme-finess-tsv` — CSV **UTF-16 tabulé** | établissement | Art. 80 + Hors art. 80 | 2020→2025 | Ambulance, Taxi, VSL | juridique fiable ; géo souvent `0` |
| plateforme B | `plateforme-finess-tsv` — CSV **UTF-16 tabulé** | établissement | Art. 80 + Hors art. 80 | 2023→2025 | Ambulance, **TAP** | juridique + géographique |
| plateforme C | `plateforme-ght-xlsx` — xlsx, en-têtes multi-niveaux | **GHT, nom libre, sans finess** | Art. 80 (total seul) + Hors art. 80 (détail véhicule) | 2023, 2024 | Taxi, VSL, Ambulance, TPMR (hors art. 80) | **aucun** |

**Référentiel externe (open data, public)** : `etablissements-de-sante-par-ght`
(https://www.data.gouv.fr/datasets/etablissements-de-sante-par-ght) — associe chaque
établissement (finess) à son GHT. Sert à (a) remonter les sources à finess vers un GHT, et
(b) rapprocher les entrées de la plateforme C (noms libres) d'un GHT.

## Le point dur : le dénominateur dépend de l'enveloppe

Le remboursement national **ne couvre pas l'Article 80** ⇒ le référentiel national ne
contient **que du hors art. 80**. Il n'existe donc pas de source indépendante donnant le
total des trajets Article 80. Règle de calcul **validée par le porteur** :

- **Hors Article 80** — dénominateur = **référentiel national** (univers complet,
  indépendant des plateformes). `part = Σ plateformes(hors art.80) / référentiel`.
  → ratio **réellement informatif**, peut être < 100 %.
- **Article 80** — dénominateur = **somme des trajets Article 80 des plateformes**
  (seule mesure disponible). `part = Σ plateformes(art.80) / Σ plateformes(art.80)`.
  → ratio **= 100 % par construction**.

> ⚠️ **Conséquence à acter** : pour l'Article 80, le ratio « via plateforme » est
> trivialement 100 %. L'information utile est donc le **volume** et la **part de chaque
> plateforme** dans ce total, pas le ratio. Les marts exposeront les **volumes** en plus du
> ratio pour que ce soit exploitable.

## Décisions de cadrage

1. **Stack** : **TypeScript / Node**, isolé dans `apps/data-analyzer` (cohérent avec le
   monorepo). Node 24 exécute le TS nativement. Parsing xlsx via SheetJS ; CSV UTF-16
   décodés explicitement.
2. **Générique, piloté par la donnée** : le code ne connaît que des **rôles** et des
   **formats**. Un fichier d'entrée est déclaré dans `mapping.json` (rôle, format, chemin,
   options) ; un **adaptateur** par format encapsule toute la connaissance propre à la
   source. Ajouter une source = une ligne de mapping (+ un adaptateur si format nouveau).
3. **Versionnement — le plus simple qui donne un résultat, puis on itère** : pas de dbt ni
   de versionnement de schéma pour l'instant. Suite de **scripts par étape**. La
   reproductibilité vient de git (**code + référentiels publics figés**) et de
   `mapping.json` (local). Les artefacts `build/` sont **régénérables**, donc non versionnés.
4. **Deux marts** (rendus possibles par le rattachement finess ↔ GHT) :
   - `mart_etablissement` — **partiel** : plateformes à finess (A + B) vs référentiel, par
     **finess**. Exclut la plateforme C (pas de finess, non redescendable sur un établissement).
   - `mart_ght` — **exhaustif** : toutes les plateformes **remontées au GHT** (A + B via le
     référentiel externe ; C déjà au GHT), vs référentiel agrégé au GHT.
5. **Enveloppe = dimension d'analyse**, avec le dénominateur par enveloppe ci-dessus.
6. **Confidentialité** : `data/`, `build/` (dont le mart) et `mapping.json` ne sont **pas**
   versionnés ; `src/`, `ref/` (open data figé) et `mapping.example.json` le sont.

## Nomenclature véhicule canonique

Les taxonomies divergent et la **plateforme B ne fournit que « TAP »** (assis, non
décomposable en taxi/VSL). La seule granularité **commune à toutes les sources** est donc
grossière ; chaque adaptateur porte son propre mapping vers le canonique :

| Canonique | Référentiel national | Plateforme A | Plateforme B | Plateforme C |
|---|---|---|---|---|
| **Ambulance** | Ambulance | Ambulance | Ambulance | Ambulance |
| **Assis** | VSL + TP_VSL + taxi | VSL + Taxi | TAP | VSL + Taxi |
| **Autre** | autre mode | — | — | TPMR |

> Choix retenu : analyser au niveau **canonique grossier** (Ambulance / Assis / Autre) pour
> garantir la comparabilité numérateur ↔ dénominateur. Le détail fin (taxi/VSL) pourra
> venir en itération si utile.

## Architecture du pipeline

Quatre étapes, chacune un script ; artefacts intermédiaires dans `build/` (régénérables).
La connaissance propre à une source est **entièrement dans son adaptateur** ; les étapes
2 à 4 sont génériques et ne raisonnent que sur les rôles.

```
apps/data-analyzer/
  mapping.json               # (NON versionné) fichiers réels → rôle + format + options
  mapping.example.json       # gabarit neutre versionné
  ref/                       # référentiels publics figés (open data) — ex. ght.csv (à venir)
  data/                      # (NON versionné) sources brutes
  build/                     # (NON versionné) artefacts régénérables
    extract/trajets/<label>.csv   #   lignes normalisées par source
    extract/etablissements.csv    #   dimension établissements (émise par les référentiels)
    staging/trajets.csv           #   sources réunies + agrégées au grain canonique
    reconcile/etablissements.csv  #   libellé représentatif par finess juridique
    marts/mart_etablissement.csv  #   résultat
  src/
    mapping.ts                 # chargement + validation de mapping.json
    01-extract/
      extract.ts               # applique l'adaptateur de chaque source
      adapteurs/               # un adaptateur par format + registre
    02-staging/staging.ts
    03-reconcile/reconcile.ts
    04-marts/marts.ts
    run.ts                     # enchaîne les 4 étapes
```

### 1. `extract` — décoder via l'adaptateur du format
Pour chaque entrée du mapping, applique l'adaptateur de son `format` : décode l'encodage
(UTF-16 tabulé ; double en-tête à dé-pivoter ; en-têtes multi-niveaux) **et** traduit vers
la nomenclature canonique. Produit des lignes normalisées `TrajetRow` (taguées du rôle et
d'un `label` neutre) et, pour les référentiels, la dimension établissements. Filtre les
lignes d'agrégat sans finess.

### 2. `staging` — réunir et agréger
Concatène les sorties `extract/trajets/*.csv` et agrège au grain canonique (ex. VSL + TP_VSL
+ taxi d'un référentiel → une ligne « Assis »). Sortie : `staging/trajets.csv`.

### 3. `reconcile` — clés finess & GHT
- **Clé établissement** : `finess_juridique` (fiable partout ; le finess géographique de la
  plateforme A est souvent `0`). À confirmer contre la granularité du référentiel externe.
- **Dimension établissements** : dédupliquée au finess juridique, en retenant le site au
  plus gros volume (`score`) comme libellé représentatif.
- **finess → GHT** (à venir) via `ref/ght.csv` pour le référentiel et les plateformes A/B.
- **Plateforme C → GHT** (à venir) via un mapping **manuel commité** (≈ 24 entrées, noms
  libres bruités, dont des **établissements isolés et non des GHT**). Un rapprochement flou
  sert à **pré-remplir** ; la table fait foi. Entrée `Total` ignorée.

### 4. `marts` — calcul des parts (sur les rôles)
- `mart_etablissement` : jointure plateformes (rôle `plateforme`, à finess) ↔ référentiel
  (rôle `referentiel-national`) sur `finess_juridique × annee × vehicule_canonique`, **hors
  art. 80**. Colonnes : `finess, nom, ville, departement, annee, vehicule, nb_plateforme,
  nb_reference, part`. `part = nb_plateforme / nb_reference` ; `""` (NULL) si pas de
  dénominateur (année non couverte).
- `mart_ght` (à venir) : toutes les plateformes remontées au GHT. Deux blocs :
  - **hors art. 80** : `part = Σ plateformes / référentiel(GHT)`.
  - **art. 80** : `nb` par plateforme + `part_plateforme = nb_source / Σ plateformes`.

## Points ouverts / à confirmer

- **art. 80 = 100 %** : valider que « volumes + part par plateforme » (et non un ratio)
  répond au besoin métier.
- **Recouvrement des années** : le dénominateur ne couvre que **2024-2025** ; toute donnée
  plateforme hors de cette fenêtre a `part = NULL` (tracé, pas supprimé). Acceptable ?
- **Clé finess** : juridique vs géographique selon la clé du référentiel externe (à
  récupérer et inspecter). Voir la limite ci-dessous.
- **Qualité du mapping GHT de la plateforme C** : noms libres mêlant GHT et établissements
  isolés ; à relire par le porteur.

## Limite connue — grain finess juridique

~0,5 % des cellules comparables ont `part > 1` (plateforme > référentiel). Au grain **finess
juridique**, certaines entités agrègent un réseau national, et le référentiel répartit
parfois les trajets sur les finess **géographiques** ; l'attribution plateforme ↔ référentiel
ne se réconcilie alors pas. `marts` **signale** ces cellules sans les corriger. Arbitrage :
joindre au finess géographique quand la source le fournit (plateforme B oui, A non) ;
plafonner ; ou marquer comme réserve.

## Vérification (itération 1)

1. `npm --prefix apps/data-analyzer run etl` enchaîne les 4 étapes sans erreur et régénère
   `build/`.
2. Contrôles de cohérence : totaux par source conservés à travers extract → staging ;
   cellules `part > 1` en hors art. 80 **comptées et signalées** (limite ci-dessus).
3. `mart_etablissement.csv` : pour quelques finess, `part` hors art. 80 sur 2024 plausible
   (0–1) ; années non couvertes → `NULL`.
4. Chaque étape est **rejouable seule** à partir des artefacts de la précédente.
