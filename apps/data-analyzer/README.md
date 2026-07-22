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
npm run etl        # enchaîne les 4 étapes ; régénère build/
# ou étape par étape :
npm run extract && npm run staging && npm run reconcile && npm run marts
npm test           # tests unitaires (vitest)
```

Node 24 (exécution TypeScript native, aucun build). SheetJS pour les `.xlsx`.

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

- **`role`** — `referentiel-national` (dénominateur, hors art. 80) ou `plateforme` (numérateur).
- **`format`** — un adaptateur enregistré (`src/01-extract/adapteurs/registry.ts`) :
  `referentiel-remboursement-xlsx`, `plateforme-finess-tsv`, `plateforme-ght-xlsx`.
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
| `reconcile` | poser les **clés** (dimension établissements ; rattachement GHT à venir) | `build/extract/`, `ref/` → `build/reconcile/` |
| `marts`     | appliquer la **règle de calcul** (part), sur les **rôles** | `build/reconcile/`, `build/staging/` → `build/marts/` |

Toute la connaissance propre à une source (format, colonnes, vocabulaire véhicule) est
encapsulée dans son **adaptateur** ; les étapes suivantes sont entièrement génériques.

### Artefacts produits

| Artefact | Étape | Description | Grain | Colonnes |
|---|---|---|---|---|
| `build/extract/trajets/<label>.csv` | extract | Les trajets d'une source, décodés et normalisés (rôle + nomenclature canonique). | selon la source (établissement ou GHT) × enveloppe × année × véhicule | `role, source, finess_juridique, finess_geographique, ght_libelle, enveloppe, annee, vehicule_canonique, nb_trajets` |
| `build/extract/etablissements.csv` | extract | L'identité des établissements, émise par les référentiels. | site (finess géographique) | `finess_juridique, finess_geographique, nom, ville, departement, categorie, score` |
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
(référentiels open data figés), `mapping.example.json` (gabarit neutre). Les libellés de
véhicule et noms de colonnes présents dans les adaptateurs décrivent des **formats**, pas
des fournisseurs.

## État (itération 1)

Livré : `build/marts/mart_etablissement.csv` — part **hors Article 80** des plateformes à
finess rapportée au référentiel national, par finess juridique × année × véhicule canonique
(`nb_plateforme`, `nb_reference`, `part`). `part = ""` quand il n'y a pas de dénominateur
pour la cellule (années non couvertes par le référentiel, tracé).

À venir : `mart_ght` (exhaustif, plateformes au niveau GHT remontées via le référentiel),
qui requiert le rattachement finess → GHT (`ref/ght.csv`, cf. spec).

### Limite connue — grain finess juridique

~0,5 % des cellules comparables ont `part > 1` (plateforme > référentiel). Cause : au grain
**finess juridique**, certaines entités agrègent un réseau national, et le référentiel
répartit parfois les trajets sur les finess **géographiques** ; l'attribution plateforme ↔
référentiel ne se réconcilie alors pas. `marts` **signale** ces cellules (ne les corrige
pas). Arbitrage à faire (joindre au finess géographique quand la source le fournit ;
plafonner ; ou marquer comme réserve).
