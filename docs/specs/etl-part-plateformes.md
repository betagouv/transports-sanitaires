# Spec — ETL versionné : part des trajets réalisés via les plateformes

> Statut : cadrage validé avec le porteur le 2026-07-22. Le code est dans
> `apps/data-analyzer`, voir son README. **Livré** : le référentiel finess vers GHT
> (source `referentiel-ght`, 888 finess et 135 GHT) ; `reconcile`, qui ré-clé les trajets
> sur l'autorité du référentiel et les rattache au GHT ; et **5 marts**
> (`mart_geographique`, `mart_juridique`, `mart_ght`, `mart_hors_ght`, `mart_article80`).
> **Décisions actées** : l'autorité est le référentiel ; `part>1` est exposé et non
> corrigé ; l'article 80 a son mart dédié ; la plateforme au niveau GHT, qui n'a pas de
> finess, est rattachée via le mapping manuel `ref/plateforme-ght-mapping.csv` dont les 23
> libellés ont été relus, et l'AP-HP est traitée comme un GHT via un override finess
> (`ref/finess-ght-manuel.csv`). Reste à faire : l'exploitation des livrables.

> **Confidentialité.** Le monorepo est public ; ni les données ni l'identité des
> fournisseurs ne le sont. Cette spec, comme le code, est anonyme : elle parle de rôles
> (`référentiel national`, `plateforme`) et de formats de fichier, jamais d'un fournisseur
> nommé. L'association entre fichiers réels et rôles ou formats vit dans `mapping.json`,
> qui n'est pas versionné. Cf. la section Confidentialité du README.

## Objectif

Pour chaque établissement (finess) et chaque GHT, connaître la part des trajets réalisés
via les plateformes, qui est le numérateur, rapportée au référentiel national de
remboursement, qui est le dénominateur. Le tout ventilé par :

- année,
- type de transport (véhicule),
- enveloppe (Article 80 ou Hors Article 80).

L'ETL doit être versionné, dans git et sur `main`, et évolutif : intégrer une nouvelle
extraction — nouvelle année, nouvelle plateforme, référentiel mis à jour — sans
réécriture, en déclarant simplement le fichier dans `mapping.json`.

## Sources

Quatre fichiers d'entrée, décrits par leur rôle et leur format, qui sont une structure
publique et non identifiante. Les plateformes A et B partagent un même format, traité par
un adaptateur paramétré.

| Rôle | Format | Grain | Enveloppe | Années | Véhicules | Finess |
|---|---|---|---|---|---|---|
| référentiel national | `referentiel-remboursement-xlsx` — xlsx **double en-tête** (période × véhicule) | établissement | **Hors art. 80 uniquement** (le remboursement national ne couvre pas l'art. 80) | 2024, 2025 | Ambulance, VSL, TP_VSL, taxi, autre mode | juridique **et** géographique |
| plateforme A | `plateforme-finess-tsv` — CSV **UTF-16 tabulé** | établissement | Art. 80 + Hors art. 80 | 2020→2025 | Ambulance, Taxi, VSL | juridique fiable ; géo souvent `0` |
| plateforme B | `plateforme-finess-tsv` — CSV **UTF-16 tabulé** | établissement | Art. 80 + Hors art. 80 | 2023→2025 | Ambulance, **TAP** | juridique + géographique |
| plateforme C | `plateforme-ght-xlsx` — xlsx, en-têtes multi-niveaux | **GHT, nom libre, sans finess** | Art. 80 (total seul) + Hors art. 80 (détail véhicule) | 2023, 2024 | Taxi, VSL, Ambulance, TPMR (hors art. 80) | **aucun** |

Un référentiel externe, en open data public, complète ces sources :
`etablissements-de-sante-par-ght`
(https://www.data.gouv.fr/datasets/etablissements-de-sante-par-ght, ODbL, millésime 2018).
Il associe chaque établissement, par son finess, à son GHT. Il sert à deux choses :
remonter les sources qui ont un finess vers un GHT, et rapprocher d'un GHT les entrées de
la plateforme C, qui n'a que des noms libres.

Il est traité comme une source déclarée du pipeline, sous le rôle `referentiel-ght` et le
format `ght-fhir-datagouv`. Le dataset expose un bundle FHIR JSON par GHT, avec les
identifiants finess `ej` et `eg`. Ces bundles sont versionnés dans `ref/ght/` : 135
bundles, environ 24 Mo, en ODbL. L'ETL est donc autonome et n'a aucune étape réseau,
`npm run fetch-ght` ne servant qu'à les rafraîchir. `extract` les transforme en
`build/extract/ght.csv`, au grain finess juridique vers GHT, régénérable. Une réserve : un
GHT ne regroupe que les hôpitaux publics, donc seule une minorité des finess des sources,
environ 9 %, s'y rattache. Voir les points ouverts.

## Le point dur : le dénominateur dépend de l'enveloppe

Le remboursement national ne couvre pas l'Article 80, donc le référentiel national ne
contient que du hors article 80. Il n'existe pas de source indépendante donnant le total
des trajets Article 80. La règle de calcul, validée par le porteur, est la suivante :

- **Hors Article 80.** Le dénominateur est le référentiel national, qui est un univers
  complet et indépendant des plateformes. On calcule
  `part = Σ plateformes(hors art.80) / référentiel`. Ce ratio est réellement informatif,
  et peut être inférieur à 100 %.
- **Article 80.** Le dénominateur est la somme des trajets Article 80 des plateformes,
  seule mesure disponible. On calcule `part = Σ plateformes(art.80) / Σ plateformes(art.80)`,
  donc le ratio vaut 100 % par construction.

> ⚠️ **Conséquence à acter** : pour l'Article 80, le ratio « via plateforme » est
> trivialement 100 %. L'information utile est donc le volume et la part de chaque
> plateforme dans ce total, pas le ratio. Les marts exposeront les volumes en plus du
> ratio pour que ce soit exploitable.

## Décisions de cadrage

1. **Stack.** TypeScript et Node, isolés dans `apps/data-analyzer`, ce qui est cohérent
   avec le monorepo. Node 24 exécute le TS nativement. Le parsing xlsx passe par SheetJS,
   et les CSV UTF-16 sont décodés explicitement.
2. **Générique, piloté par la donnée.** Le code ne connaît que des rôles et des formats.
   Un fichier d'entrée est déclaré dans `mapping.json`, avec son rôle, son format, son
   chemin et ses options ; un adaptateur par format encapsule toute la connaissance propre
   à la source. Ajouter une source revient à ajouter une ligne de mapping, et un adaptateur
   si le format est nouveau.
3. **Versionnement : le plus simple qui donne un résultat, puis on itère.** Pas de dbt ni
   de versionnement de schéma pour l'instant, mais une suite de scripts par étape. La
   reproductibilité vient de git, qui fige le code et les référentiels publics, et de
   `mapping.json`, qui reste local. Les artefacts de `build/` sont régénérables, donc non
   versionnés.
4. **Deux marts**, rendus possibles par le rattachement entre finess et GHT :
   - `mart_etablissement`, partiel : les plateformes qui ont un finess, A et B, comparées
     au référentiel, par finess. Il exclut la plateforme C, faute de finess, qu'on ne peut
     pas redescendre sur un établissement.
   - `mart_ght`, exhaustif : toutes les plateformes remontées au GHT — A et B via le
     référentiel externe, C qui y est déjà — comparées au référentiel agrégé au GHT.
5. **L'enveloppe est une dimension d'analyse**, avec le dénominateur par enveloppe
   ci-dessus.
6. **Confidentialité.** `data/`, `build/`, le mart compris, et `mapping.json` ne sont pas
   versionnés. `src/`, `ref/`, qui est de l'open data figé, et `mapping.example.json` le
   sont.

## Nomenclature véhicule canonique

Les taxonomies divergent, et la plateforme B ne fournit que « TAP », c'est-à-dire de
l'assis non décomposable entre taxi et VSL. La seule granularité commune à toutes les
sources est donc grossière. Chaque adaptateur porte son propre mapping vers le canonique :

| Canonique | Référentiel national | Plateforme A | Plateforme B | Plateforme C |
|---|---|---|---|---|
| **Ambulance** | Ambulance | Ambulance | Ambulance | Ambulance |
| **Assis** | VSL + TP_VSL + taxi | VSL + Taxi | TAP | VSL + Taxi |
| **Autre** | autre mode | — | — | TPMR |

> Choix retenu : analyser au niveau canonique grossier, Ambulance, Assis et Autre, pour
> garantir la comparabilité entre numérateur et dénominateur. Le détail fin, taxi contre
> VSL, pourra venir en itération si c'est utile.

## Architecture du pipeline

Quatre étapes, chacune dans son script, avec des artefacts intermédiaires régénérables
dans `build/`. La connaissance propre à une source est entièrement dans son adaptateur ;
les étapes 2 à 4 sont génériques et ne raisonnent que sur les rôles.

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

Pour chaque entrée du mapping, on applique l'adaptateur de son `format`. Il décode
l'encodage — UTF-16 tabulé, double en-tête à dé-pivoter, en-têtes multi-niveaux — et
traduit vers la nomenclature canonique. Il produit des lignes normalisées `TrajetRow`,
taguées du rôle et d'un `label` neutre, et, pour les référentiels, la dimension
établissements. Les lignes d'agrégat sans finess sont filtrées.

### 2. `staging` — réunir et agréger

On concatène les sorties `extract/trajets/*.csv` et on agrège au grain canonique : les
VSL, TP_VSL et taxi d'un référentiel deviennent par exemple une seule ligne « Assis ». La
sortie est `staging/trajets.csv`.

### 3. `reconcile` — clés finess & GHT

- **Ré-clé sur l'autorité du référentiel.** Le `finess_juridique` d'un trajet est remplacé
  par celui que le référentiel national associe à son site géographique, via une table géo
  vers juridique de 18 653 sites, sans aucun cas ambigu. Les deux sources divergent parfois
  sur le juridique d'un même site ; on tranche par le référentiel. La sortie est
  `build/reconcile/trajets.csv`.
- **Dimension établissements.** Elle est dédupliquée au finess juridique, en retenant
  comme libellé représentatif le site au plus gros volume (`score`).
- **Rattachement finess vers GHT** via `build/extract/ght.csv`, issu de la source
  `referentiel-ght`, appliqué à chaque trajet dans `ght_code`, laissé vide si
  l'établissement n'est dans aucun GHT.
- **Rattachement de la plateforme C au GHT** via un mapping manuel commité,
  `ref/plateforme-ght-mapping.csv`. Il compte 23 entrées, aux noms libres et bruités, dont
  certaines sont des établissements isolés et non des GHT. Un rapprochement flou contre les
  libellés et les raisons sociales de `build/extract/ght.csv` a servi à le pré-remplir,
  mais c'est la table, relue par le porteur, qui fait foi. `reconcile` joint sur le libellé
  nettoyé de ses notes. Trois cas particuliers : l'AP-HP est un GHT à part entière, via
  l'override finess `ref/finess-ght-manuel.csv` qui associe le finess juridique 750712184 au
  code `AP-HP` avec son dénominateur réel ; FOCH et CGFL sont rattachés par territoire,
  n'étant pas membres ; l'entrée `Total` est ignorée.

### 4. `marts` — cinq livrables (même calcul, grains différents)

Ils se calculent sur `build/reconcile/trajets.csv`. Quatre marts de ratio portent sur le
hors article 80, avec `part = Σ plateformes / référentiel`, une valeur `""` s'il n'y a pas
de dénominateur, et une `alerte_qualite="part>1"` exposée sans correction :
`mart_geographique`, au grain géo et donc avec beaucoup de NULL, `mart_juridique`, au grain
juridique, `mart_ght`, au grain GHT et le plus propre, et `mart_hors_ght`, au grain
juridique pour les établissements sans GHT. S'y ajoute `mart_article80`, qui donne les
volumes et la part par plateforme (`part_plateforme = source / Σ plateformes`), aux grains
juridique et GHT. La plateforme au niveau GHT, sans finess, rejoindra `mart_ght` et
`mart_article80` une fois `ref/plateforme-ght-mapping.csv` construit.

## Points ouverts / à confirmer

- **Article 80 à 100 %** : valider que les volumes et la part par plateforme, plutôt qu'un
  ratio, répondent au besoin métier.
- **Recouvrement des années** : le dénominateur ne couvre que 2024 et 2025, donc toute
  donnée plateforme hors de cette fenêtre a `part = NULL`, tracée et non supprimée. Est-ce
  acceptable ?
- **Clé finess** : juridique ou géographique, selon la clé du référentiel externe, qui
  reste à récupérer et à inspecter. Voir la limite ci-dessous.
- **Qualité du mapping GHT de la plateforme C** : ses noms libres mêlent des GHT et des
  établissements isolés, et sont à relire par le porteur.
- **Couverture du référentiel GHT** : un GHT ne regroupe que les hôpitaux publics, soit 888
  finess juridiques et 135 GHT, alors que les transports remboursés concernent aussi des
  cliniques privées, des centres d'imagerie et d'autres. Seule une minorité des finess des
  sources, environ 9 %, se rattache donc à un GHT, et `mart_ght` ne couvrira que ce
  sous-ensemble public. Est-ce le périmètre attendu, ou faut-il aussi un regroupement hors
  GHT ? À trancher avec le porteur.
- **Millésime du référentiel GHT** : 2018. La carte des 135 GHT est stable depuis 2016,
  mais des fusions et des rattachements ont pu bouger. Les finess non reconnus seront
  signalés par `reconcile`.

## Limite connue — `part > 1` résiduel (divergence entre systèmes)

Deux systèmes indépendants, les plateformes et le remboursement national, ne s'emboîtent
jamais parfaitement. Après la ré-clé sur l'autorité du référentiel, il reste des cellules
`part > 1`, pour des raisons de périmètre, de calendrier ou de reclassement de véhicule.
Elles sont exposées par `alerte_qualite`, sans correction. Le grain amortit la divergence :
elle est la plus forte au grain géographique, moindre au juridique, et proche de zéro au
grain GHT. Le détail et des exemples sont dans la section « Points d'attention métier » du
README.

## Vérification

1. `npm --prefix apps/data-analyzer run etl`, sans aucune étape réseau puisque les
   référentiels sont dans `ref/` : les 4 étapes s'enchaînent sans erreur et régénèrent
   `build/`, dont les 5 marts.
2. Contrôles de cohérence : les totaux par source sont conservés entre extract et staging ;
   les cellules `part > 1` sont comptées et signalées par `alerte_qualite`, et décroissent
   du grain géographique au grain GHT.
3. `mart_ght.csv` : la `part` hors article 80 tient dans [0, 1], les plateformes étant
   incluses dans le national au grain GHT. Dans les autres `mart_*`, les années non
   couvertes donnent une `part` à NULL.
4. Chaque étape est rejouable seule, à partir des artefacts de la précédente.
5. Tests : `npm test`, qui couvre les adaptateurs, le calcul des marts et les CSV.
