# Spec — Encoder les questions « choix multiple » au format `mosaique`

> Règle de traduction **spec métier → Publicodes**, quand une question est à choix
> multiple. Format déjà consommé par le front (`front/simulateur/mosaique.ts`) et
> appliqué à `p1_motif` (`regles/regles.publicodes`).

## Pourquoi

Publicodes ne modélise pas le choix multiple (une règle = une valeur). On garde
donc **N booléens** (une règle par réponse) et on ajoute **une règle parente
inerte** portant la métadonnée `mosaique` : le moteur l'ignore, l'UI l'utilise pour
afficher **une question à N cases à cocher**.

## Quand

- **Choix multiple** (réponses cochables ensemble) → `mosaique`.
- **Choix unique** → `une possibilité` natif (hors sujet).
- **Oui/Non** → un booléen (hors sujet).

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

Clés lues par le front : `question` (parente, obligatoire), `mosaique.options`,
`mosaique.option aucun`. `type: selection` : à inclure par convention.

## Contraintes

- Noms **plats** (aucun ` . ` ; slug minuscule, `_`).
- Parente **inerte** : ni `valeur`/`formule`/`une possibilité`/`applicable si`, ni
  référencée ailleurs. **La logique aval référence les booléens, pas la parente.**
- Chaque nom de `options`/`option aucun` doit être un booléen émis. Parente placée
  juste après ses booléens.
- Type ambigu ou « aucun » à sémantique métier (voir plus bas) → **signaler**, ne
  pas trancher.

## Exemple

Entrée (spec métier) : *M1.1 — « Quelle situation justifie le transport ? », choix
multiple, 6 réponses dont « Aucun de ces motifs » (exclusif).*

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

La logique (« si ALD → M2 », « si un motif hors ALD → ouvrant droit ») s'encode
ensuite en référençant les booléens (`p1_motif_ald`, `une de ces conditions`…).

## Option « aucun » à sémantique métier

Cocher « aucun » **active sa propre règle** (`option aucun`) en plus de décocher les
autres options. Un « aucun » porteur de logique aval — ex.
`p1_critere_aucune_situation_encadree`, qui déduit le transport « véhicule personnel
ou transport en commun » — est donc correctement pris en compte.
