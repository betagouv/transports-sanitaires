# Spec — Encoder les questions « choix multiple » au format `mosaique`

> Statut : **prompt outil**. Règle de traduction à appliquer quand un LLM convertit
> la **spec métier** du questionnaire en modèle **Publicodes**. Le format décrit est
> déjà consommé par le front (`front/simulateur/mosaique.ts`, `Mosaique.tsx`,
> `Parcours.tsx`) et appliqué en référence au groupe des motifs (`p1_motif`, cf.
> `regles/regles.publicodes`).

## Rôle

Tu traduis une **spec métier** de questionnaire en modèle **Publicodes** (YAML).
Quand la spec décrit une question à **choix multiple**, tu l'encodes **directement**
au format `mosaique` — sans étape intermédiaire. Cette spec définit **cet encodage
précis** ; le reste de la traduction (motifs calculés, conditions, résultats) suit
les règles Publicodes habituelles.

## Contexte technique (à comprendre avant d'agir)

- Publicodes ne sait **pas** modéliser un choix multiple : une règle n'a qu'une
  valeur. Un choix multiple se modélise donc par **N règles booléennes
  indépendantes** (une par réponse).
- `mosaique` **n'est pas** un mécanisme d'évaluation : c'est une **métadonnée
  d'UI** posée sur une règle parente, **ignorée par le moteur**, lue par
  l'interface pour afficher **une seule question avec N cases à cocher** (au lieu
  de N questions oui/non).
- Tu produis donc, pour une question à choix multiple : **N booléens + 1 règle
  parente** porteuse de la métadonnée.

## Entrée

Un bloc de spec métier décrivant une question, typiquement :

- un **intitulé** (la question affichée) ;
- un **type** (Choix multiple / Choix unique / Oui-Non) ;
- une **liste de réponses** ;
- éventuellement une **règle d'exclusivité** (« Aucun … » décoche les autres) ;
- éventuellement la **logique** aval (ce que chaque réponse déclenche).

## Quand appliquer `mosaique`

- **Type = Choix multiple** (plusieurs réponses cochables **simultanément**) →
  format `mosaique` (ci-dessous).
- **Type = Choix unique** (une seule réponse) → **pas** de mosaïque : utiliser le
  mécanisme natif `une possibilité` (hors de cette spec).
- **Type = Oui/Non** → une seule règle booléenne (hors de cette spec).

## Format cible (ce que tu produis)

Pour une question à choix multiple d'intitulé `Q` et de réponses `R1…Rn` (dont
éventuellement une réponse « Aucun … ») :

**1. Une règle booléenne par réponse.** Nom plat `<prefixe>_<slug>` ; le `question:`
reprend le texte de la réponse.

```yaml
<prefixe>_<slug_R1>:
  question: <texte de R1>
# … une par réponse, y compris la réponse « Aucun … »
```

**2. Une règle parente** nommée `<prefixe>`, porteuse de la métadonnée :

```yaml
<prefixe>:
  titre: <libellé court de la question>
  question: <intitulé Q affiché à l'utilisateur>
  mosaique:
    type: selection
    options:
    - <prefixe>_<slug_R1>
    - <prefixe>_<slug_R2>
    - ...
    option aucun: <prefixe>_<slug_aucun>   # facultatif
```

Clés lues par le front (à respecter à la lettre) :

- **`question`** (sur la parente) → énoncé affiché au-dessus des cases. Obligatoire.
- **`mosaique.options`** → liste **ordonnée** (ordre de la spec) des noms des règles
  booléennes de réponse. Le libellé de chaque case vient du `question:` de la règle
  option.
- **`mosaique.option aucun`** → règle booléenne de la réponse « aucune de ces
  options » (case d'**exclusivité** : la cocher décoche les autres). **À omettre**
  si la question n'a pas de réponse « Aucun ».
- `type: selection` : conservé par convention (repris de nosgestesclimats) ; non
  lu, mais à inclure.

## Contraintes / invariants

- Nommage **plat** : aucun ` . ` (point entouré d'espaces) dans les noms de règles
  (contrainte Publicodes Studio). Slug en minuscules, mots séparés par `_`.
- La règle parente **ne doit pas** avoir de `valeur`, `formule`, `une possibilité`,
  `applicable si`, ni être **référencée** par une autre règle : elle reste
  **inerte** (pur porteur de métadonnée), pour ne jamais être évaluée ni affichée
  comme une question à part. **La logique aval référence les booléens de réponse,
  jamais la parente.**
- Chaque nom listé dans `options` / `option aucun` doit correspondre à une règle
  booléenne effectivement émise.
- Style YAML : indentation 2 espaces ; items de liste `-` alignés sur
  l'indentation du contenu de la clé. Place la règle parente **juste après** les
  booléens de son groupe.
- **Ne devine pas** en cas d'ambiguïté (type non précisé, « aucun » à double sens) :
  **signale-le** au lieu de trancher.

## Exemple

**Entrée (spec métier) :**

```
## M1.1 — Motif ouvrant droit
Question affichée : Quelle situation justifie le transport ?
Type : Choix multiple.
Réponses :
- Entrée ou sortie d’hospitalisation complète, partielle ou ambulatoire.
- Séance de chimiothérapie, radiothérapie ou hémodialyse.
- Soins ou examens en lien avec une ALD — Affection de Longue Durée.
- Soins en rapport avec un accident du travail ou une maladie professionnelle.
- Retour vers établissement pénitentiaire avec prescription médicale.
- Aucun de ces motifs.
Exclusivité : « Aucun de ces motifs » décoche les autres, et inversement.
```

**Sortie (Publicodes) :**

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

La **logique** décrite par la spec (ex. « si ALD sélectionnée → M2 », « si au moins
un motif hors ALD → motif ouvrant droit ») s'encode ensuite normalement, en
référençant les **booléens** (`p1_motif_ald`, `une de ces conditions: [...]`), pas
la parente `p1_motif`.

## Format de sortie attendu

1. Pour chaque question à choix multiple : le **YAML** des booléens de réponse
   **puis** de la règle parente `mosaique`.
2. **Section « À vérifier »** : questions dont le type est ambigu, ou dont la
   réponse « aucun » porte une **sémantique métier** (voir limite ci-dessous).

## Limite connue de l'implémentation front (à signaler, pas à traiter)

L'option « aucun » du groupe des motifs (`p1_motif_aucun`) est **inerte** : rien ne
la lit en aval, donc l'UI se contente de décocher les autres options. Un « aucun »
qui, lui, **déclenche** de la logique en aval (ex. une réponse « Aucune de ces
situations » qui pilote un mode de transport par défaut) nécessiterait que le front
**active** aussi cette règle. Le rendu mosaïque actuel ne gère pas ce cas :
signale-le dans la section « À vérifier ».
