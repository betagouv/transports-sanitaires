# Points d'attention métier

> Les [livrables](livrables.md) décrivent ce que produit l'ETL ; le
> [README de l'app](../README.md) décrit comment il tourne.

À lire avant d'interpréter les marts. Ces points ne sont pas des bugs, mais des propriétés
de la donnée ou des règles de gestion assumées. Plusieurs demandent un arbitrage du
porteur.

## 1. Divergence d'attribution entre sources, et cellules `part > 1`

Elles sont exposées et non corrigées.

Les deux systèmes rangent parfois le *même trajet réel* sous des finess différents : la
plateforme rattache un site au groupe A, le référentiel au groupe B. `reconcile` aligne
donc les finess des trajets sur le référentiel, qui fait autorité, en retenant le finess
juridique que le référentiel associe au site géographique, et non celui déclaré par la
source. Les deux plateformes à finess fournissent bien un finess géographique, sur environ
99 % des lignes. L'idée répandue d'une plateforme A sans géo est fausse sur la donnée
réelle.

Cet alignement répare les cas spectaculaires, ceux des réseaux nationaux, mais ne fait pas
tomber `part>1` à zéro. Deux systèmes indépendants ne s'emboîtent jamais parfaitement,
pour des raisons de périmètre, de calendrier et de reclassement de véhicule. Le résidu est
assumé et exposé par `alerte_qualite`, jamais plafonné ni supprimé.

L'effet du grain est contre-intuitif : plus le grain est fin, plus il y a de `part>1`. La
comparaison au grain géographique en produit le plus, celle au grain GHT le moins, les
désaccords intra-GHT s'y réconciliant. C'est pourquoi `mart_ght` est le livrable le plus
fiable.

## 2. Le GHT ne couvre que les hôpitaux publics

Environ 91 % des finess ne sont donc rattachés à aucun GHT.

Un GHT regroupe uniquement des établissements publics : 888 finess juridiques et 135 GHT,
cf. [Référentiels](../README.md#référentiels-ref). Or les transports remboursés concernent aussi les
cliniques privées, les centres d'imagerie et d'autres établissements hors GHT. Seuls
environ 9 % des finess juridiques de nos sources, à peu près 840 sur 8 400, se rattachent
donc à un GHT, et environ 91 % n'en ont aucun. `mart_ght` ne couvre que ce sous-ensemble
public. **À trancher avec le porteur** : garde-t-on le seul périmètre public en GHT, ou
prévoit-on un regroupement hors GHT à côté ?

## 3. Article 80 : un dénominateur à 100 % par construction

C'est ce qui justifie le `mart_article80` dédié.

Le remboursement national ne couvre pas l'Article 80, donc aucune source indépendante ne
donne le total article 80. Un ratio « via plateforme » vaudrait trivialement 100 %.
L'information utile est donc le volume et la part de chaque plateforme dans ce total,
c'est l'objet du livrable séparé `mart_article80.csv`. Les quatre marts de ratio restent,
eux, hors Article 80.

## 4. Fenêtre du dénominateur : `part = NULL` hors 2024-2025

Le référentiel national ne couvre que 2024 et 2025, hors article 80, alors que les
plateformes remontent dès 2020. Toute cellule plateforme hors de cette fenêtre a une
`part` à NULL. Elle est tracée et non supprimée, le numérateur restant visible. Est-ce
acceptable ? À confirmer.

## 5. Nomenclature véhicule volontairement grossière

La plateforme B ne fournit que « TAP », de l'assis qu'on ne peut pas décomposer entre taxi
et VSL. La seule granularité commune à toutes les sources est donc Ambulance, Assis et
Autre, auxquels s'ajoute `Total` pour l'article 80, qu'aucune source ne ventile. C'est ce
grain canonique qui garantit la comparabilité entre numérateur et dénominateur ; le détail
fin, taxi contre VSL, pourra venir en itération.

## 6. Plateforme hiérarchique : une couverture au finess partielle

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
[Référentiels](../README.md#référentiels-ref).

Deux d'entre eux, un **ESPIC** et un **CLCC**, ne sont membres d'aucun GHT. Ils ne sont
**pas** rattachés par territoire : leur volume vit dans `mart_juridique` et
`mart_hors_ght`, jamais dans `mart_ght`. C'est un changement assumé, qui supprime une
distorsion : les rattacher gonflait le numérateur d'un GHT d'accueil sans dénominateur en
face.

## 7. Établissements hors GHT rattachés par territoire

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

## 8. Les extractions successives d'une source ne sont pas stables

Une source a livré une nouvelle version de son extraction, qui apporte le détail par
établissement attendu, mais qui **révise aussi des totaux déjà publiés**, sur des périodes
closes et hors de toute question de granularité. Les écarts constatés vont de quelques
dizaines de trajets à plus de 10 000 sur une entité.

Le parti pris est de **retenir la dernière version livrée**, qui fait autorité, et de ne
rien réconcilier avec la précédente. Conséquence pour l'analyste : un chiffre extrait avant
cette bascule peut ne pas se retrouver à l'identique aujourd'hui, sans qu'il y ait d'erreur
de calcul. L'origine de ces révisions est à faire confirmer par l'éditeur de la source.

## 9. Un rollup annuel ne répond qu'à la question qui lui est posée

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

## 10. Quelques lignes sortent sans nom ni ville

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
