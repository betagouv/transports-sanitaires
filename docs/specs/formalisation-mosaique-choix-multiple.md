# Spec — Formaliser les questions « choix multiple » au format `mosaique`

> Statut : **prompt outil**. Spec destinée à être donnée à un LLM pour annoter le
> modèle Publicodes. Le format décrit est déjà consommé par le front
> (`front/simulateur/mosaique.ts`, `Mosaique.tsx`, `Parcours.tsx`) et appliqué en
> référence au groupe des motifs (`p1_motif`, cf. `regles/regles.publicodes`).

## Rôle

Tu reçois un modèle **Publicodes** (fichier `.publicodes`, YAML) où certaines
questions à **choix multiple** sont modélisées par **plusieurs règles booléennes**
(une par option). Ta tâche : repérer ces groupes et ajouter, pour chacun, **une
règle parente porteuse d'une métadonnée `mosaique`**, sans rien casser d'autre.

## Contexte technique (à comprendre avant d'agir)

- Publicodes ne sait **pas** modéliser un choix multiple : une règle n'a qu'une
  valeur. Un choix multiple **doit donc rester** N règles booléennes indépendantes.
- `mosaique` **n'est pas** un mécanisme d'évaluation : c'est une **métadonnée
  d'UI** posée sur une règle parente, **ignorée par le moteur**, lue par
  l'interface pour afficher **une seule question avec N cases à cocher** (au lieu
  de N questions oui/non).
- Donc : **tu ne modifies ni les booléens existants, ni aucune règle en aval.** Tu
  ne fais qu'**ajouter** des règles parentes.

## Format cible (exact)

Pour un groupe, ajouter une règle dont le nom est le **préfixe commun** des
options :

```yaml
<prefixe_commun>:
  titre: <libellé court du groupe>
  question: <question affichée à l'utilisateur>
  mosaique:
    type: selection
    options:
    - <nom_regle_option_1>
    - <nom_regle_option_2>
    - ...
    option aucun: <nom_regle_option_aucun>   # facultatif
```

Clés lues par le front (à respecter à la lettre) :

- **`question`** (sur la règle parente) → énoncé affiché au-dessus des cases.
  Obligatoire.
- **`mosaique.options`** → liste **ordonnée** de noms de règles booléennes
  **existantes**. Chaque option devient une case ; son libellé vient du `question:`
  (sinon `titre:`) de la règle option.
- **`mosaique.option aucun`** → nom de la règle booléenne signifiant « aucune de
  ces options » (case d'**exclusivité** : la cocher décoche les autres). **À
  omettre** si le groupe n'a pas d'option « aucun ».
- `type: selection` : conservé par convention (repris de nosgestesclimats) ; non
  lu, mais à inclure.

## Règles d'identification d'un groupe

Groupe = **question unique à choix multiple**. Signaux :

1. Un ensemble de règles booléennes (questions oui/non) partageant un **préfixe
   commun** (`p1_motif_*`, `p1_critere_*`…).
2. Elles alimentent une règle d'agrégation via **`une de ces conditions`** (OU
   logique) → signe qu'on peut en cocher **plusieurs à la fois**.
3. Sémantiquement, les options sont **cumulables** (un patient peut relever de
   plusieurs).

**Ne PAS créer de mosaïque** si :

- les options sont **mutuellement exclusives** (une seule vraie à la fois) → ce
  n'est pas un choix multiple ; laisser tel quel ou signaler pour un
  `une possibilité` (hors de ta mission).
- il n'y a qu'une seule règle booléenne.
- le préfixe regroupe des règles **calculées** (`valeur:`, `formule:`,
  `toutes/une de ces conditions:`) plutôt que des **questions** (`question:` sans
  formule). Seules les **questions** deviennent des options.

## Contraintes / invariants

- La règle parente **ne doit pas** avoir de `valeur`, `formule`,
  `une possibilité`, `applicable si`, ni être **référencée** par une autre règle :
  elle reste **inerte** (pur porteur de métadonnée) pour ne jamais être évaluée ni
  affichée comme question à part.
- Nommage **plat** : aucun ` . ` (point entouré d'espaces) dans les noms de règles
  (contrainte Publicodes Studio).
- Ne renomme, ne supprime, ne réordonne **aucune** règle existante. Tu **ajoutes**
  uniquement les règles parentes.
- Chaque nom listé dans `options` et `option aucun` **doit exister** dans le
  modèle. Vérifie-le.
- Style YAML : indentation 2 espaces ; items de liste `-` alignés sur
  l'indentation du contenu de la clé.
- Place la règle parente **juste après** le dernier booléen de son groupe.
- **Ne devine pas** en cas d'ambiguïté (option « aucun » à double sens, groupe
  partiellement exclusif) : **signale-le** au lieu de trancher.

## Exemple (déjà réalisé — sert de référence)

**Entrée** (extrait) :

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
# (en aval : p1_motif_hors_ald_identifie = une de ces conditions [ ... ])
```

**Sortie** (règle parente ajoutée, le reste inchangé) :

```yaml
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

## Format de sortie attendu

1. **Liste des groupes détectés** : pour chacun, le préfixe, les options retenues,
   l'option « aucun » (ou son absence), et une phrase justifiant que le choix est
   bien **multiple**.
2. **Le YAML** de chaque règle parente à insérer, avec le point d'insertion
   (« après `<dernière règle du groupe>` »).
3. **Section « À vérifier »** : groupes ambigus ou écartés (mutuellement
   exclusifs, options calculées, « aucun » à sémantique métier), sans les traiter.

## Limite connue de l'implémentation front (à signaler, pas à traiter)

L'option « aucun » du groupe des motifs (`p1_motif_aucun`) est **inerte** : rien
ne la lit en aval, donc l'UI se contente de décocher les autres options. Un
« aucun » qui, lui, **déclenche** de la logique en aval (ex.
`p1_critere_aucune_situation_encadree`, qui pilote le transport « véhicule
personnel ou transport en commun ») nécessiterait que le front **active** aussi
cette règle. Le rendu mosaïque actuel ne gère pas ce cas : signale-le dans la
section « À vérifier ».
