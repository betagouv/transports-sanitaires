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
| `mart_ght.csv` | **GHT** | **Le plus fiable** : les désaccords d'attribution intra-GHT se réconcilient (quasi 0 `part>1`). Couvre les établissements **publics en GHT** (cf. point 2) **et** la part d'une source hiérarchique restée au grain GHT (cf. point 6). |
| `mart_hors_ght.csv` | finess **juridique**, hors GHT | Complément de `mart_ght` : les établissements **sans GHT** (~91 % : cliniques privées, imagerie…). |
| `mart_article80.csv` | juridique **et** GHT | **Volumes + part par plateforme** (pas de ratio national, cf. point 3). Colonne `grain` = `juridique`/`ght`. |
| `mart_ght_2024.csv` | **GHT**, année 2024, **tous transports** | **Rollup du mart GHT** : une ligne par GHT couvert (56 des 136), somme des véhicules pour 2024. Vue de synthèse « taux réel de recours aux plateformes par GHT ». |
| `mart_juridique_2024.csv` | **finess juridique**, année 2024, **tous transports** | **Rollup du mart juridique** : une ligne par établissement couvert (442). Le même chiffre que ci-dessus, au grain où il s'interprète (cf. [point 9](#9-un-rollup-annuel-ne-répond-quà-la-question-qui-lui-est-posée)). C'est ce mart que consomme la vue Grist « part plateforme par établissement ». |

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
[Configuration des entrées](#configuration-des-entrées--mappingjson).

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
Autre, auxquels s'ajoute `Total` pour l'article 80, qu'aucune source ne ventile. C'est ce
grain canonique qui garantit la comparabilité entre numérateur et dénominateur ; le détail
fin, taxi contre VSL, pourra venir en itération.

### 6. Plateforme hiérarchique : une couverture au finess partielle

Une source remonte un fichier **hiérarchique** : une ligne par GHT ou par établissement, et
sous certaines d'entre elles le détail de leurs sites, avec finess. Le format
`plateforme-ght-xlsx` en tire deux grains à la fois. Quatre conséquences à la lecture des
marts.

- **La couverture au finess est partielle.** Environ 94 % du volume hors article 80 2024 de
  cette source porte un finess juridique, donc apparaît dans `mart_juridique`. Le reste,
  une entité réellement multi-sites et sans détail, n'existe qu'au grain GHT. Sommer
  `mart_juridique` sous-compte donc cette source de quelques pour cent, sans signal.
- **L'écart entre une ligne parente et la somme de ses lignes filles est perdu.** Il va
  jusqu'à 13 % sur une entité. Un parent qui a des filles est ignoré, pour ne rien compter
  deux fois. Reprendre cet écart demanderait d'émettre un résidu, ce qui n'est pas fait.
- Le référentiel finess vers GHT est au **millésime 2018**. La carte des 135 GHT est
  stable depuis 2016, mais des fusions ont pu bouger. Les finess non reconnus sont
  signalés par `reconcile`, jamais inventés.
- Un `part>1` apparaît si le périmètre annoncé par la source dépasse le GHT officiel :
  c'est le cas observé du GHT Vendée, à `part ≈ 2,9`. C'est exposé par `alerte_qualite`, et
  à investiguer.

Les libellés qui désignent un **établissement** et non un GHT, ce qui est le cas de la
plupart, reçoivent leur finess juridique par le mapping manuel
`ref/plateforme-finess-mapping.csv`, et leur GHT suit tout seul. Cf.
[Référentiels](#référentiels-ref).

Deux d'entre eux, un **ESPIC** et un **CLCC**, ne sont membres d'aucun GHT. Ils ne sont
**pas** rattachés par territoire : leur volume vit dans `mart_juridique` et
`mart_hors_ght`, jamais dans `mart_ght`. C'est un changement assumé, qui supprime une
distorsion : les rattacher gonflait le numérateur d'un GHT d'accueil sans dénominateur en
face.

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
de santé que le GHT retenu. ⚠️ Ils gonflent le numérateur du GHT d'accueil sans
dénominateur en face, ces établissements n'étant pas dans le référentiel national du GHT,
et peuvent donc tirer la `part` vers le haut. C'est la raison pour laquelle les deux cas
du [point 6](#6-plateforme-hiérarchique--une-couverture-au-finess-partielle) ne sont plus
rattachés ainsi.

**Un cas est exclu, le CH de Cayenne (970302022, Guyane).** La Guyane n'a aucun GHT dans
l'open data, et le GHT le plus proche se trouve à quelque 1 400 km d'océan, en Martinique
ou en Guadeloupe, presque équidistantes. Aucun territoire de santé commun ne justifie un
rattachement, et le forcer vers un GHT antillais serait un artefact géographique qui
fausserait sa `part`. Il est donc laissé hors GHT : ses trajets restent visibles dans
`mart_juridique`, `mart_geographique` et `mart_hors_ght`, mais pas dans `mart_ght`. À
rouvrir avec le porteur si un rattachement outre-mer devient pertinent, ce qui ne demande
qu'une ligne de plus dans `ref/finess-ght-manuel.csv`.

### 8. Les extractions successives d'une source ne sont pas stables

Une source a livré une nouvelle version de son extraction, qui apporte le détail par
établissement attendu, mais qui **révise aussi des totaux déjà publiés**, sur des périodes
closes et hors de toute question de granularité. Les écarts constatés vont de quelques
dizaines de trajets à plus de 10 000 sur une entité.

Le parti pris est de **retenir la dernière version livrée**, qui fait autorité, et de ne
rien réconcilier avec la précédente. Conséquence pour l'analyste : un chiffre extrait avant
cette bascule peut ne pas se retrouver à l'identique aujourd'hui, sans qu'il y ait d'erreur
de calcul. L'origine de ces révisions est à faire confirmer par l'éditeur de la source.

### 9. Un rollup annuel ne répond qu'à la question qui lui est posée

`mart_ght_2024` et `mart_juridique_2024` somment les véhicules d'une seule année. C'est ce
qui les rend lisibles, et c'est aussi ce qu'ils coûtent. Quatre limites à connaître avant
de citer un de leurs ratios.

- **Le rollup masque une anomalie portée par un seul véhicule.** `GHT Vendée` sort à
  `166 678 / 56 707` sur l'ambulance en 2024, soit `part ≈ 2,9` et une `alerte_qualite`
  dans `mart_ght`. Une fois les véhicules sommés, son ratio repasse sous 1 et l'alerte
  disparaît. **Aucun GHT n'est signalé en 2024**, ce qui ne veut pas dire qu'aucun ne pose
  question : c'est `mart_ght` qu'il faut ouvrir pour le savoir.
- **Au grain établissement, le numérateur est incomplet de 10 %.** 183 813 des 1 827 882
  trajets plateforme 2024 hors article 80 n'ont aucun finess juridique, et n'entrent donc
  pas dans `mart_juridique_2024`. C'est le [point 6](#6-plateforme-hiérarchique--une-couverture-au-finess-partielle)
  vu depuis le livrable.
- **Le rollup ne porte plus l'agrégat national.** Il ne retient que les 442 établissements
  qui ont à la fois des trajets plateforme et des trajets remboursés, et son agrégat,
  `1 643 844 / 20 578 041` soit **7,99 %**, se lit « chez les établissements couverts par
  une plateforme ». La part du remboursement national réalisée via les plateformes est une
  autre question, et elle se calcule sur `mart_juridique` filtré sur 2024 :
  `1 644 069 / 62 930 184` soit **2,61 %**, un plancher pour la raison ci-dessus. **Les
  deux chiffres sont justes et ne répondent pas à la même question.** Le filtre écarte au
  passage 225 trajets plateforme, ceux des 4 établissements sans remboursement 2024.
- **Le nom affiché est celui du site le plus gros, pas celui de l'entité.** `reconcile` élit
  un libellé représentatif par finess juridique. Sur une entité multi-sites, il désigne un
  site et peut contredire le département de la ligne ; sur un CHU, il désigne parfois le
  siège administratif. **Le `finess_juridique` fait foi, le nom n'est qu'un confort.**

### 10. Quelques lignes sortent sans nom ni ville

Un mart n'habille une clé que si le référentiel national la connaît. Un finess déclaré par
une plateforme mais absent du référentiel produit une ligne avec ses volumes et une
identité vide. Deux causes ont été corrigées, une troisième reste ouverte.

| Cause | Où c'est traité | Effet |
|---|---|---|
| Zéro de tête perdu (colonne stockée en numérique en amont) | `extract` normalise tout finess à 9 caractères (`src/finess.ts`) | corrigé |
| Colonnes juridique et géographique interverties | `reconcile` rend son entité juridique à un code déclaré juridique qui n'est qu'un site du référentiel | corrigé |
| Finess inconnu du référentiel | rien | ligne sans identité |

Le référentiel d'identité n'est pas l'annuaire FINESS complet : il est dérivé de la source
nationale de remboursement, soit 8 522 finess juridiques pour 19 789 sites. Un
établissement qui n'y figure pas n'a pas de nom, et pas de dénominateur non plus : ces
lignes sortent toujours avec `nb_reference = 0` et une `part` à `NULL`.

Il en reste **5 clés dans `mart_juridique`, 4 995 trajets, 0,05 % du numérateur
plateforme**. Elles sont à faire qualifier par les plateformes : soit le code est erroné,
soit l'établissement est absent du référentiel de remboursement. Aucune n'apparaît dans
les rollups 2024, qui écartent les entités sans trajet remboursé.

Trois codes de test présents dans les extractions sources ont par ailleurs été retirés à la
main. Le geste ne tient pas : `data/` n'est pas versionné, et une nouvelle livraison les
ramènera tant que la correction n'est pas faite chez la plateforme.

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
    "plateforme": "Plateforme A",
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
  `plateforme-ght-xlsx` lit un fichier **hiérarchique** : une ligne fille, reconnue à son
  préfixe `« - »`, porte son finess juridique en fin de libellé ; une ligne parente porte un
  libellé libre. Un parent qui a des filles est ignoré, sauf pour son détail véhicule quand
  aucune de ses filles n'en porte. Cf. le
  [point 6](#6-plateforme-hiérarchique--une-couverture-au-finess-partielle). Le format
  `plateforme-finess-xlsx`, au grain établissement, avec des en-têtes multi-niveaux et une
  colonne par année, porte l'article 80 en total et le hors article 80 en détail partiel,
  taxi, VSL et ambulance. Le reliquat, la différence entre le total et le détail, est
  imputé à `Autre` pour boucler le total annoncé.
- **`location`** est le chemin du fichier, absolu ou relatif à la racine de l'app.
- **`label`** est un identifiant neutre et unique, qui nomme les artefacts de traçabilité.
- **`plateforme`** est le nom affiché dans la colonne `plateforme` des marts. Il n'a de sens
  que pour le rôle `plateforme` et **n'existe nulle part dans le code versionné** : c'est
  ici, dans un fichier non versionné, que le nom d'un fournisseur est autorisé. Absent, la
  colonne retombe sur le `label`.
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
| `extract`   | appliquer à chaque fichier l'**adaptateur de son format** → lignes normalisées (rôle + nomenclature canonique), puis **rétablir le zéro de tête** des finess tronqués | `mapping.json`, sources → `build/extract/` |
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
| `build/marts/mart_*.csv` | marts | Les **7 [livrables](#livrables-marts)** (dont les deux rollups annuels, dérivés de `mart_ght` et de `mart_juridique`). | selon le mart |

## Publication (dataviz)

C'est une étape optionnelle, hors des 4 étapes de l'ETL, et la seule étape réseau, en
écriture. Elle pousse les marts dans Grist pour les explorer et bâtir la dataviz. Son but
premier est de révéler le taux réel de recours aux plateformes par GHT, dans la colonne
`part` de `Mart_Ght`, et surtout la colonne `ratio` de `Mart_Juridique_2024`, au grain
établissement, qui est celui où le chiffre s'interprète.

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

Chaque mart publiable déclare sa table et ses colonnes dans `marts()`
(`src/05-publish/publish.ts`) : ajouter un mart revient à ajouter une entrée. Pour chacun,
la publication garantit la table, en la créant avec ses colonnes si elle est absente et en
complétant les colonnes manquantes, puis remplace tout son contenu, en le vidant et en
réinsérant. La sémantique est celle d'un snapshot : idempotente, sans lignes périmées, et
relançable après chaque `pnpm marts`.

La publication ne touche pas à l'arborescence des pages : Grist crée une page à la racine
pour chaque table nouvelle, et elle y reste. Ranger la barre latérale, si le besoin s'en
fait sentir, se fait à la main dans Grist.

| Mart | Table Grist |
|---|---|
| `mart_ght.csv` (`ght`) | `Mart_Ght` |
| `mart_ght_2024.csv` (`ght_2024`) | `Mart_Ght_2024` |
| `mart_juridique_2024.csv` (`juridique_2024`) | `Mart_Juridique_2024` |
| `mart_juridique.csv` (`juridique`) | `Mart_Juridique` |
| `mart_geographique.csv` (`geographique`) | `Mart_Geographique` |
| `mart_hors_ght.csv` (`hors_ght`) | `Mart_Hors_Ght` |
| `mart_article80.csv` (`article80`) | `Mart_Article80` |

⚠️ Le mart contient de vrais établissements, cf. [Confidentialité](#confidentialité) : le
doc Grist cible doit rester privé.

⚠️ `publish-grist` n'a **aucune reprise sur erreur**. Comme chaque table est vidée avant
d'être réinsérée par lots, une coupure en cours de mart laisse la table vide ou partielle,
et la relance suivante ne le signale pas. Vérifier le compte de lignes après une
publication interrompue.

## Référentiels (`ref/`)

`ref/` ne contient que des référentiels publics et non identifiants, versionnés pour la
reproductibilité : de l'open data figé et des mappings manuels relus par le porteur. Ils ne
portent que des noms d'établissements et de GHT publics, aucune donnée ni identité de
fournisseur.

| Fichier | Rôle | Colonnes | Jointure `reconcile` | Contenu |
|---|---|---|---|---|
| `ght/*.json` | Référentiel **finess → GHT** open data (source `referentiel-ght`). | — (FHIR) | via l'adaptateur `ght-fhir-datagouv` → `build/extract/ght.csv` | 135 bundles FHIR data.gouv `etablissements-de-sante-par-ght` (ODbL), 1 par GHT, ~24 Mo. Rattache **888 finess juridiques à 135 GHT**. `pnpm fetch-ght` les rafraîchit. |
| `plateforme-finess-mapping.csv` | Rend son **finess juridique** à un libellé libre qui désigne un **établissement** et non un GHT. Le GHT suit alors tout seul, par l'open data. | `libelle, finess_juridique, nom` | sur `libelle` (nettoyé de ses notes entre parenthèses), **avant** le mapping GHT | 18 entrées, relues par le porteur. Les libellés sont recopiés tels quels, fautes de frappe de la source comprises : c'est la clé de jointure. 6 d'entre elles ne sont pas jointes aujourd'hui : la source liste bien l'établissement, mais à zéro partout. Elles restent pour le jour où elle livrera ses volumes. |
| `plateforme-ght-mapping.csv` | Rattache à un GHT les **libellés libres** qui désignent un vrai GHT et pour lesquels il n'y a aucun finess à trouver. | `libelle, ght_code, ght_officiel` | sur `libelle` (nettoyé de ses notes entre parenthèses) | 3 entrées ; un fuzzy match a pré-rempli, la table relue **fait foi**. C'est un **repli**, plus la clé principale : quand la source donne le détail au finess de son GHT, c'est elle qui fait autorité et l'entrée n'a plus lieu d'être. L'une des trois n'est pas jointe aujourd'hui, son GHT étant listé à zéro. |
| `finess-ght-manuel.csv` | Overrides **finess juridique → GHT**, fusionnés par-dessus l'open data pour les entités hors référentiel. | `finess_juridique, ght_code, ght_officiel` | sur `finess_juridique` | L'**AP-HP** (750712184 → `AP-HP`, GHT à part entière) ; et **4 établissements structurellement hors des 135 GHT** (CLCC, EFS, Martinique) rencontrés dans les sources plateforme, rattachés au **GHT de leur territoire** (cf. [point 7](#7-établissements-hors-ght-rattachés-par-territoire), qui documente aussi le CH de Cayenne, laissé **hors GHT**). |

Le finess prime toujours sur le libellé : `reconcile` cherche d'abord un finess, qui porte
le rattachement au GHT, et ne retombe sur le mapping GHT que s'il n'en trouve aucun. Les
conséquences métier de ces rattachements manuels sont au
[point 6](#6-plateforme-hiérarchique--une-couverture-au-finess-partielle). Les
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
