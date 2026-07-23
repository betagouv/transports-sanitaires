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
| `reconcile` | poser les **clés** (dimension établissements ; remontée au GHT via `build/extract/ght.csv`, à venir) | `build/extract/` → `build/reconcile/` |
| `marts`     | appliquer la **règle de calcul** (part), sur les **rôles** | `build/reconcile/`, `build/staging/` → `build/marts/` |

Toute la connaissance propre à une source (format, colonnes, vocabulaire véhicule) est
encapsulée dans son **adaptateur** ; les étapes suivantes sont entièrement génériques.

### Artefacts produits

| Artefact | Étape | Description | Grain | Colonnes |
|---|---|---|---|---|
| `build/extract/trajets/<label>.csv` | extract | Les trajets d'une source, décodés et normalisés (rôle + nomenclature canonique). | selon la source (établissement ou GHT) × enveloppe × année × véhicule | `role, source, finess_juridique, finess_geographique, ght_libelle, enveloppe, annee, vehicule_canonique, nb_trajets` |
| `build/extract/etablissements.csv` | extract | L'identité des établissements, émise par les référentiels. | site (finess géographique) | `finess_juridique, finess_geographique, nom, ville, departement, categorie, score` |
| `build/extract/ght.csv` | extract | Le rattachement finess juridique → GHT (open data, source `referentiel-ght`). Produit seulement si la source est déclarée et `data/ght/` peuplé (`fetch-ght`). | finess juridique | `finess_juridique, ght_code, ght_libelle, region, raison_sociale` |
| `build/staging/trajets.csv` | staging | Toutes les sources réunies et agrégées au grain canonique, prêtes à être jointes. | schéma long commun (toutes sources) | idem `trajets/<label>.csv` |
| `build/reconcile/etablissements.csv` | reconcile | Le libellé (nom, ville, département) représentatif de chaque établissement, pour habiller le mart. | dimension établissement (finess juridique) | `finess_juridique, nom, ville, departement, categorie` |
| `build/marts/mart_etablissement.csv` | marts | Le résultat : la part des trajets réalisés via les plateformes, par établissement. | finess juridique × année × véhicule | `finess_juridique, nom, ville, departement, annee, vehicule, nb_plateforme, nb_reference, part` |

Nomenclature : `vehicule_canonique` ∈ {Ambulance, Assis, Autre, Total}. `part` =
`nb_plateforme / nb_reference`, vide si pas de dénominateur pour la cellule.

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

## État (itération 1)

Livré : `build/marts/mart_etablissement.csv` — part **hors Article 80** des plateformes à
finess rapportée au référentiel national, par finess juridique × année × véhicule canonique
(`nb_plateforme`, `nb_reference`, `part`). `part = ""` quand il n'y a pas de dénominateur
pour la cellule (années non couvertes par le référentiel, tracé).

Référentiel GHT disponible : `build/extract/ght.csv` (source `referentiel-ght`, open data
data.gouv `etablissements-de-sante-par-ght`) rattache **888 finess juridiques** à **135 GHT**.
Prérequis de `mart_ght`, désormais levé.

À venir : `reconcile` remonte trajets + référentiel au GHT via `build/extract/ght.csv`, puis
`mart_ght` (exhaustif). Les réserves à trancher sont regroupées ci-dessous.

## Points d'attention métier

À lire avant d'interpréter les marts. Ces points ne sont pas des bugs mais des propriétés de
la donnée ou des règles de gestion assumées ; plusieurs demandent un arbitrage du porteur.

### 1. Grain finess **juridique** vs **géographique** ⇒ cellules `part > 1`

La clé de jointure est le **finess juridique** (fiable partout ; le finess géographique de la
plateforme A est souvent `0`). Conséquence : ~0,5 % des cellules comparables ont `part > 1`
(plateforme > référentiel). Au grain juridique, certaines entités **agrègent un réseau
national**, et le référentiel répartit parfois les trajets sur les finess **géographiques** ;
l'attribution plateforme ↔ référentiel ne se réconcilie alors pas. `marts` **signale** ces
cellules (les compte en fin de run) sans les corriger. Arbitrage possible : joindre au finess
géographique quand la source le fournit (plateforme B oui, A non) ; plafonner à 1 ; ou marquer
en réserve.

### 2. Le GHT ne couvre que les **hôpitaux publics** ⇒ ~91 % des finess non rattachés

Un GHT regroupe uniquement des établissements **publics** : le référentiel finess → GHT
compte **888 finess juridiques / 135 GHT**. Or les transports remboursés concernent aussi les
**cliniques privées, centres d'imagerie, etc.**, hors GHT. Résultat : seuls **≈ 9 %** des
finess juridiques de nos sources (≈ 840 sur ~8 400) se rattachent à un GHT ; **~91 % n'en ont
aucun**. `mart_ght` ne couvrira donc que ce **sous-ensemble public**. Symétriquement, les 135
GHT ne représentent qu'une petite part des finess de l'univers transport. **À trancher avec le
porteur** : périmètre « public en GHT » seulement, ou prévoir un regroupement « hors GHT » à
côté ?

### 3. Article 80 : dénominateur = 100 % **par construction**

Le remboursement national ne couvre **pas** l'Article 80 ⇒ pas de source indépendante donnant
le total art. 80. Le dénominateur art. 80 est donc la **somme des plateformes elles-mêmes**, si
bien que « part via plateforme » vaut trivialement **100 %**. L'information utile n'est pas ce
ratio mais le **volume** et la **part de chaque plateforme** dans ce total : `mart_ght`
exposera les volumes, pas seulement le ratio. (Présentation à valider avec le porteur.)

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
