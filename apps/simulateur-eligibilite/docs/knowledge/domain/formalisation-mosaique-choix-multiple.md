# Spec — Encoder les questions « choix multiple » au format `mosaique`

> Règle de traduction d'une spec métier vers Publicodes, quand une question est à
> choix multiple. Le format est déjà consommé par le front
> (`front/simulateur/mosaique.ts`) et appliqué à `p1_motif`
> (`regles/regles.publicodes`).

## Pourquoi

Publicodes ne modélise pas le choix multiple : une règle porte une valeur. On garde
donc N booléens, une règle par réponse, et on ajoute une règle parente inerte qui
porte la métadonnée `mosaique`. Le moteur l'ignore ; l'UI s'en sert pour afficher
une question à N cases à cocher.

## Quand

- Une question à **choix multiple**, dont les réponses se cochent ensemble, prend le
  format `mosaique`.
- Une question à **choix unique** prend le `une possibilité` natif, qui est hors
  sujet ici.
- Une question **oui/non** prend un booléen, hors sujet également.

## Format produit

Pour une question `Q` de réponses `R1…Rn` :

```yaml
# un booléen par réponse (y compris « Aucun … »)
<prefixe>_<slug_R1>:
  question: <texte de R1>
# … puis la règle parente :
<prefixe>:
  titre: <libellé court>
  question: <Q affichée>
  mosaique:
    type: selection
    options:            # noms des booléens, dans l'ordre de la spec
    - <prefixe>_<slug_R1>
    - ...
    option aucun: <prefixe>_<slug_aucun>   # facultatif
```

Le front lit trois clés : `question` sur la parente, qui est obligatoire,
`mosaique.options` et `mosaique.option aucun`. On inclut `type: selection` par
convention.

## Contraintes

- Les noms sont plats : aucun ` . `, un slug en minuscules avec des `_`.
- La parente est inerte. Elle n'a ni `valeur`, ni `formule`, ni `une possibilité`,
  ni `applicable si`, et rien ne la référence. **La logique aval référence les
  booléens, pas la parente.**
- Chaque nom cité dans `options` ou `option aucun` doit être un booléen émis. La
  parente se place juste après ses booléens.
- Si le type de question est ambigu, ou si le « aucun » porte une sémantique métier
  (voir plus bas), le signaler plutôt que de trancher.

## Exemple

Entrée, côté spec métier : *M1.1 — « Quelle situation justifie le transport ? »,
choix multiple, 6 réponses dont « Aucun de ces motifs », exclusive.*

```yaml
p1_motif_hospitalisation:
  question: Entrée ou sortie d’hospitalisation complète, partielle ou ambulatoire.
p1_motif_seance_chimio_radio_hemodialyse:
  question: Séance de chimiothérapie, radiothérapie ou hémodialyse.
p1_motif_ald:
  question: Soins ou examens en lien avec une ALD — Affection de Longue Durée.
p1_motif_accident_travail_maladie_professionnelle:
  question: Soins en rapport avec un accident du travail ou une maladie professionnelle.
p1_motif_retour_etablissement_penitentiaire:
  question: Retour vers établissement pénitentiaire avec prescription médicale.
p1_motif_aucun:
  question: Aucun de ces motifs.
p1_motif:
  titre: Motif ouvrant droit
  question: Quelle situation justifie le transport ?
  mosaique:
    type: selection
    options:
    - p1_motif_hospitalisation
    - p1_motif_seance_chimio_radio_hemodialyse
    - p1_motif_ald
    - p1_motif_accident_travail_maladie_professionnelle
    - p1_motif_retour_etablissement_penitentiaire
    option aucun: p1_motif_aucun
```

La logique s'encode ensuite en référençant les booléens : « si ALD, alors M2 », « si
un motif hors ALD, alors ouvrant droit », écrites avec `p1_motif_ald`,
`une de ces conditions` et les autres.

## Option « aucun » à sémantique métier

Cocher « aucun » active sa propre règle, celle nommée par `option aucun`, en plus de
décocher les autres options. Un « aucun » qui porte de la logique aval est donc
correctement pris en compte. C'est le cas de
`p1_critere_aucune_situation_encadree`, qui déduit le transport en véhicule
personnel ou en transport en commun.
