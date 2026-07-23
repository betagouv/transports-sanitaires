# data-analyzer — ETL « part des trajets via les plateformes »

ETL versionné calculant la **part des trajets réalisés via les plateformes** (numérateur),
rapportée au **référentiel national de remboursement** (dénominateur), par établissement /
GHT × année × type de transport × enveloppe.

> **Code public, données et fournisseurs privés.** Le code de l'ETL est générique : il ne
> connaît que des **rôles** (`plateforme`, `referentiel-national`) et des **formats de
> fichier**, jamais l'identité d'un fournisseur ni la moindre donnée. L'association entre
> les fichiers réels (et leurs fournisseurs) et ces formats/rôles vit dans `mapping.json`,
> **non versionné**. Voir « Confidentialité » plus bas.

Spec de cadrage : [`docs/specs/etl-part-plateformes.md`](../../docs/specs/etl-part-plateformes.md).

## Lancer

```bash
npm install
cp mapping.example.json mapping.json   # puis renseigner vos fichiers (voir ci-dessous)
npm run fetch-ght  # aspire le référentiel GHT open data (data.gouv) dans data/ght/
npm run etl        # enchaîne les 4 étapes ; régénère build/
# ou étape par étape :
npm run extract && npm run staging && npm run reconcile && npm run marts
npm test           # tests unitaires (vitest)
```

Node 24 (exécution TypeScript native, aucun build). SheetJS pour les `.xlsx`.

`fetch-ght` télécharge le référentiel public **finess → GHT** (data.gouv `etablissements-de-sante-par-ght`, ODbL) dans `data/ght/` (non versionné). Il est **séparé de l'ETL** pour que `npm run etl` reste déterministe et hors-ligne ; à relancer seulement pour rafraîchir le référentiel.

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
  ou `referentiel-ght` (rattachement finess → GHT, open data — voir `fetch-ght`).
- **`format`** — un adaptateur enregistré (`src/01-extract/adapteurs/registry.ts`) :
  `referentiel-remboursement-xlsx`, `plateforme-finess-tsv`, `plateforme-ght-xlsx`,
  `ght-fhir-datagouv` (dont la `location` est le **dossier** `data/ght/`).
- **`location`** — chemin du fichier (absolu ou relatif à la racine de l'app).
- **`label`** — identifiant neutre, unique (nomme les artefacts de traçabilité).
- **`options`** — paramètres propres au format (ex. index de colonnes finess pour le TSV),
  ce qui permet à plusieurs fichiers de partager un même adaptateur.

Une entrée invalide (rôle/format/location/label manquant, format inconnu) fait échouer
l'ETL avec un message explicite.

## Pipeline (une étape = une source de complexité)

| Étape | Responsabilité | Entrée → sortie |
|---|---|---|
| `extract`   | appliquer à chaque fichier l'**adaptateur de son format** → lignes normalisées (rôle + nomenclature canonique) | `mapping.json`, sources → `build/extract/` |
| `staging`   | **réunir** les sources et **agréger** au grain canonique | `build/extract/trajets/` → `build/staging/trajets.csv` |
| `reconcile` | poser les **clés** : dimension établissements ; **ré-clé** des trajets sur l'autorité du référentiel ; rattachement au GHT | `build/extract/`, `build/staging/` → `build/reconcile/` |
| `marts`     | appliquer les **règles de calcul** (part / volumes), sur les **rôles**, à chaque grain | `build/reconcile/` → `build/marts/` |

Toute la connaissance propre à une source (format, colonnes, vocabulaire véhicule) est
encapsulée dans son **adaptateur** ; les étapes suivantes sont entièrement génériques.

### Artefacts produits

| Artefact | Étape | Description | Grain | Colonnes |
|---|---|---|---|---|
| `build/extract/trajets/<label>.csv` | extract | Les trajets d'une source, décodés et normalisés (rôle + nomenclature canonique). | selon la source (établissement ou GHT) × enveloppe × année × véhicule | `role, source, finess_juridique, finess_geographique, ght_libelle, enveloppe, annee, vehicule_canonique, nb_trajets` |
| `build/extract/etablissements.csv` | extract | L'identité des établissements, émise par les référentiels. | site (finess géographique) | `finess_juridique, finess_geographique, nom, ville, departement, categorie, score` |
| `build/extract/ght.csv` | extract | Le rattachement finess juridique → GHT (open data, source `referentiel-ght`). Produit seulement si la source est déclarée et `data/ght/` peuplé (`fetch-ght`). | finess juridique | `finess_juridique, ght_code, ght_libelle, region, raison_sociale` |
| `build/staging/trajets.csv` | staging | Toutes les sources réunies et agrégées au grain canonique, prêtes à être jointes. | schéma long commun (toutes sources) | idem `trajets/<label>.csv` |
| `build/reconcile/etablissements.csv` | reconcile | Le libellé (nom, ville, département) représentatif de chaque établissement, pour habiller les marts. | dimension établissement (finess juridique) | `finess_juridique, nom, ville, departement, categorie` |
| `build/reconcile/trajets.csv` | reconcile | Les trajets **ré-clés** sur l'autorité du référentiel (finess juridique du site tel que vu par le référentiel) et **rattachés au GHT**. Base commune des marts. | idem staging + `ght_code` | `role, source, finess_juridique, finess_geographique, ght_code, ght_libelle, enveloppe, annee, vehicule_canonique, nb_trajets` |
| `build/marts/mart_*.csv` | marts | Les **5 livrables** (voir tableau « Livrables » ci-dessous). | selon le mart | selon le mart |

Nomenclature : `vehicule_canonique` ∈ {Ambulance, Assis, Autre, Total}. Dans les marts ratio,
`part = nb_plateforme / nb_reference`, vide (NULL) si pas de dénominateur, et
`alerte_qualite = "part>1"` quand le numérateur dépasse le dénominateur (signal assumé).

## Confidentialité

Le monorepo est public ; les données et l'identité des fournisseurs ne le sont pas. Ne
sont **jamais** versionnés :

- `data/` — sources brutes ;
- `build/` — **tous** les artefacts (dont le mart, qui contient de vrais établissements) ;
- `mapping.json` — lie fichiers réels + fournisseurs aux formats/rôles.

Sont versionnés (publics, non identifiants) : `src/` (code générique), `ref/`
(référentiels open data figés — mappings manuels), `mapping.example.json` (gabarit neutre).
Les libellés de véhicule et noms de colonnes présents dans les adaptateurs décrivent des
**formats**, pas des fournisseurs.

Le référentiel GHT (`data/ght/`, produit `build/extract/ght.csv`) est de l'open data public
(ODbL) ; il n'est **pas** versionné mais **régénérable** via `npm run fetch-ght` (réseau),
conformément au principe « `build/` régénérable ».

## Livrables (marts)

Chaque mart est le **même calcul à un grain différent** sur `build/reconcile/trajets.csv`
(trajets ré-clés sur l'autorité du référentiel + rattachés au GHT). Les quatre marts « ratio »
partagent les colonnes `… annee, vehicule, nb_plateforme, nb_reference, part, alerte_qualite`.

| Livrable | Grain | À savoir / limite |
|---|---|---|
| `mart_geographique.csv` | finess **géographique** | Le plus fin, mais **beaucoup de `part` NULL** : le référentiel n'a pas toujours de valeur sur *le même site* que la plateforme (dénominateur absent). Exclut les sources sans finess géographique. |
| `mart_juridique.csv` | finess **juridique** (autorité référentiel) | Livrable établissement principal. Résidu de `part>1` (divergence réelle entre les deux systèmes, cf. point 1). |
| `mart_ght.csv` | **GHT** | **Le plus propre** : les désaccords d'attribution intra-GHT se réconcilient (0 `part>1` observé). Ne couvre que les établissements **publics en GHT** (cf. point 2). La plateforme au niveau GHT (sans finess) **pas encore incluse** (cf. point 6). |
| `mart_hors_ght.csv` | finess **juridique**, hors GHT | Complément de `mart_ght` : les établissements **sans GHT** (~91 % : cliniques privées, imagerie…). |
| `mart_article80.csv` | juridique **et** GHT | **Volumes + part par plateforme** (pas de ratio national — cf. point 3). Colonne `grain` = `juridique`/`ght`. Plateforme au niveau GHT pas encore incluse. |

Référentiel GHT : `build/extract/ght.csv` (source `referentiel-ght`, open data data.gouv
`etablissements-de-sante-par-ght`) rattache **888 finess juridiques** à **135 GHT**.

À venir : intégrer **la plateforme au niveau GHT** (sans finess) à `mart_ght` et
`mart_article80` via le mapping manuel `ref/plateforme-ght-mapping.csv` (à relire par le porteur).

## Points d'attention métier

À lire avant d'interpréter les marts. Ces points ne sont pas des bugs mais des propriétés de
la donnée ou des règles de gestion assumées ; plusieurs demandent un arbitrage du porteur.

### 1. Divergence d'attribution entre sources ⇒ cellules `part > 1` (exposées, non corrigées)

Les deux systèmes rangent parfois le *même trajet réel* sous des finess **différents** (la
plateforme dit « site → groupe A », le référentiel « site → groupe B »). `reconcile` ré-clé
donc les trajets sur **l'autorité du référentiel** (le finess juridique que le référentiel
associe au site géographique, pas celui déclaré par la source) — décision actée. Les deux
plateformes à finess fournissent bien un finess **géographique** (~99 % des lignes ; l'idée
répandue « plateforme A sans géo » est **fausse** sur la donnée réelle).

Ce ré-clé **répare les cas spectaculaires** (réseaux nationaux), mais ne fait **pas** tomber
`part>1` à zéro : deux systèmes indépendants ne s'emboîtent jamais parfaitement (périmètre,
calendrier, reclassement véhicule). Le résidu est **assumé et exposé** via `alerte_qualite =
"part>1"` (signal de qualité), jamais plafonné ni supprimé — décision actée.

Effet du grain (contre-intuitif) : **plus le grain est fin, plus il y a de `part>1`** — la
comparaison au grain géographique en produit le plus, le grain GHT le moins (les désaccords
intra-GHT se réconcilient). C'est pourquoi `mart_ght` est le livrable le plus fiable.

### 2. Le GHT ne couvre que les **hôpitaux publics** ⇒ ~91 % des finess non rattachés

Un GHT regroupe uniquement des établissements **publics** : le référentiel finess → GHT
compte **888 finess juridiques / 135 GHT**. Or les transports remboursés concernent aussi les
**cliniques privées, centres d'imagerie, etc.**, hors GHT. Résultat : seuls **≈ 9 %** des
finess juridiques de nos sources (≈ 840 sur ~8 400) se rattachent à un GHT ; **~91 % n'en ont
aucun**. `mart_ght` ne couvrira donc que ce **sous-ensemble public**. Symétriquement, les 135
GHT ne représentent qu'une petite part des finess de l'univers transport. **À trancher avec le
porteur** : périmètre « public en GHT » seulement, ou prévoir un regroupement « hors GHT » à
côté ?

### 3. Article 80 : dénominateur = 100 % **par construction** → `mart_article80` dédié

Le remboursement national ne couvre **pas** l'Article 80 ⇒ pas de source indépendante donnant
le total art. 80. Un ratio « via plateforme » vaudrait trivialement **100 %**. L'information
utile est donc le **volume** et la **part de chaque plateforme** dans ce total : c'est l'objet
du livrable séparé **`mart_article80.csv`** (`part_plateforme = source / Σ plateformes`), aux
grains juridique et GHT. Les quatre marts « ratio » restent, eux, **hors Article 80**.

### 4. Fenêtre du dénominateur : `part = NULL` hors 2024-2025

Le référentiel national ne couvre que **2024-2025** (hors art. 80), alors que les plateformes
remontent dès 2020. Toute cellule plateforme hors de cette fenêtre a **`part = ""` (NULL)** —
**tracée, pas supprimée** (le numérateur reste visible). Acceptable ? à confirmer.

### 5. Nomenclature véhicule volontairement **grossière**

La plateforme B ne fournit que « TAP » (assis, non décomposable en taxi/VSL). La seule
granularité **commune à toutes les sources** est donc **Ambulance / Assis / Autre** (+ `Total`
pour l'art. 80 des plateformes au niveau GHT). C'est ce grain canonique qui garantit la
comparabilité numérateur ↔ dénominateur ; le détail fin (taxi/VSL) pourra venir en itération.

### 6. Référentiel GHT — millésime **2018** et libellés libres de la plateforme C

Le référentiel finess → GHT date de **2018** (carte des 135 GHT stable depuis 2016, mais des
fusions/rattachements ont pu bouger depuis) : les finess non reconnus seront **signalés** par
`reconcile`, pas inventés. Par ailleurs la plateforme au niveau GHT fournit des **libellés
libres bruités** (mêlant vrais GHT et établissements isolés), à rapprocher manuellement d'un
GHT via `ref/plateforme-ght-mapping.csv` (relu par le porteur ; un fuzzy match ne fait que
pré-remplir).
