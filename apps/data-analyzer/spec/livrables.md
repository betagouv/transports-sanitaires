# Livrables (marts)

> Ce que produit l'ETL et comment le lire. Le fonctionnement du pipeline est dans le
> [README de l'app](../README.md).

Chaque mart est le même calcul à un grain différent, sur des trajets réconciliés,
c'est-à-dire dont les finess sont alignés sur le référentiel, qui fait autorité, puis
rattachés au GHT. Voir [Pipeline](../README.md#pipeline--artefacts) et le
[point 1](points-attention-metier.md#1-divergence-dattribution-entre-sources-et-cellules-part--1).

| Livrable | Grain | À savoir / limite |
|---|---|---|
| `mart_geographique.csv` | finess **géographique** | Le plus fin, mais **beaucoup de `part` NULL** : le référentiel n'a pas toujours de valeur sur *le même site* que la plateforme (dénominateur absent). Exclut les sources sans finess géographique. |
| `mart_juridique.csv` | finess **juridique** (autorité référentiel) | Livrable établissement principal. Résidu de `part>1` (divergence réelle entre les deux systèmes, cf. point 1). |
| `mart_ght.csv` | **GHT** | **Le plus fiable** : les désaccords d'attribution intra-GHT se réconcilient (quasi 0 `part>1`). Couvre les établissements **publics en GHT** (cf. point 2) **et** la part d'une source hiérarchique restée au grain GHT (cf. point 6). |
| `mart_hors_ght.csv` | finess **juridique**, hors GHT | Complément de `mart_ght` : les établissements **sans GHT** (~91 % : cliniques privées, imagerie…). |
| `mart_article80.csv` | juridique **et** GHT | **Volumes + part par plateforme** (pas de ratio national, cf. point 3). Colonne `grain` = `juridique`/`ght`. |
| `mart_ght_2024.csv` | **GHT**, année 2024, **tous transports** | **Rollup du mart GHT** : une ligne par GHT couvert (56 des 136), somme des véhicules pour 2024. Vue de synthèse « taux réel de recours aux plateformes par GHT ». |
| `mart_juridique_2024.csv` | **finess juridique**, année 2024, **tous transports** | **Rollup du mart juridique** : une ligne par établissement couvert (442). Le même chiffre que ci-dessus, au grain où il s'interprète (cf. [point 9](points-attention-metier.md#9-un-rollup-annuel-ne-répond-quà-la-question-qui-lui-est-posée)). C'est ce mart que consomme la vue Grist « part plateforme par établissement ». |

Les marts de ratio — `geographique`, `juridique`, `ght` et `hors_ght` — portent les
colonnes `… annee, vehicule, plateforme, nb_plateforme, nb_reference, part, alerte_qualite`,
où :

- `part = nb_plateforme / nb_reference`, hors Article 80, et reste vide, donc NULL, s'il
  n'y a pas de dénominateur ;
- `alerte_qualite = "part>1"` quand le numérateur dépasse le dénominateur. C'est un signal
  assumé, qu'on ne corrige pas.

Ils portent en plus une colonne **`plateforme`**, qui nomme d'où vient le numérateur de la
cellule. Elle est vide quand la cellule n'a que du référentiel. Quand plusieurs plateformes
déclarent des trajets sur la même cellule, les noms sont triés et joints par ` + `, par
exemple `Plateforme A + Plateforme B` : réduire à une seule mentirait sur l'origine du
chiffre. Les noms eux-mêmes viennent de `mapping.json`, cf.
[Configuration des entrées](../README.md#configuration-des-entrées--mappingjson).

Les deux **rollups annuels**, `ght_2024` et `juridique_2024`, sont le même calcul à deux
grains : ils somment les véhicules du mart de ratio correspondant pour la seule année 2024
et portent `… annee, plateforme, nb_plateforme, nb_cnam, ratio, alerte_qualite`, où `nb_cnam` est le
référentiel national, `ratio = nb_plateforme / nb_cnam` et
`alerte_qualite = "ratio>1"` selon la même règle que `part>1`.

**Ils ne retiennent que les entités qui portent les deux membres du ratio**, donc au moins
un trajet plateforme et au moins un trajet remboursé. Une entité sans trajet plateforme
sortirait à 0, une entité sans remboursement à NULL : ni l'une ni l'autre ne dit quoi que
ce soit d'un taux de recours, et à elles deux elles représentaient 94 % des lignes. Le
fait « cet établissement n'a aucun trajet plateforme » reste lisible dans le mart de ratio
dont le rollup dérive.

`mart_article80` porte à la place `nb` et `part_plateforme = source / Σ plateformes`, et sa
colonne `plateforme` porte une seule plateforme par ligne, puisque c'est son grain. La
nomenclature véhicule canonique est `vehicule ∈ {Ambulance, Assis, Autre, Total}`.
