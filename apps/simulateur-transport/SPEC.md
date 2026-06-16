# Simulateur d'éligibilité aux transports sanitaires — Spec V1

## Objectif

Permettre à un médecin (ou son personnel) de répondre à un questionnaire sur
la situation d'un patient et d'obtenir :

- **Éligibilité** à la prise en charge du transport : oui / non
- **Mode de transport** prescriptible : véhicule personnel / TAP (taxi-VSL) / ambulance
- **Accord préalable requis** : oui / non
- **Détail des règles évaluées** : trace complète de la décision (arbre publicode)

Hors scope V1 : pré-remplissage de la prescription, calcul des frais
kilométriques, taux de remboursement.

Source des règles : référentiel CNAM
(https://www.ameli.fr/transporteur-sanitaire/exercice-professionnel/prescription-prise-charge).

## Périmètre des situations couvertes

1. Hospitalisation / séances assimilées (chimiothérapie, radiothérapie, dialyse)
2. Accident du travail / maladie professionnelle reconnu
3. ALD (affection longue durée) : ALD reconnue + transport lié à l'ALD +
   déficience/incapacité justifiant le transport (critère simplifié,
   sans détail du référentiel de déficiences par pathologie)
4. Longue distance (> 150 km aller) et transport en série
   (≥ 4 trajets > 50 km sur 2 mois pour le même traitement)

Hors scope V1 : convocations administratives, transports CAMSP/CMPP.

## Modèle de questions

### Situation médicale

- `situation . hospitalisation ou séance` (oui/non) — entrée/sortie
  d'établissement, chimio, radiothérapie, dialyse
- `situation . accident du travail` (oui/non)
- `situation . ALD . statut` — non / ALD non exonérante / ALD exonérante
- `situation . ALD . lien avec le transport` (oui/non, affiché si ALD)
- `situation . ALD . déficience ou incapacité` (oui/non, affiché si ALD) —
  question générique, sans détail par catégorie de déficience
- `situation . distance aller` (km, saisie manuelle — pas de calcul
  d'adresses en V1)
- `situation . nombre de trajets sur 2 mois` (affiché si distance > 50 km)

### Autonomie du patient (pour le mode de transport)

- `autonomie . déplacement autonome` (oui/non)
- `autonomie . aide technique ou tierce personne` (oui/non)
- `autonomie . risque d'effets secondaires pendant le trajet` (oui/non)
- `autonomie . position allongée, surveillance ou conditions stériles` (oui/non)

## Règles de décision

### Éligibilité

```
éligible =
  situation . hospitalisation ou séance
  OU situation . accident du travail
  OU (situation . ALD . statut != "non"
      ET situation . ALD . lien avec le transport
      ET situation . ALD . déficience ou incapacité)
  OU situation . distance aller > 150
  OU (situation . distance aller > 50 ET situation . nombre de trajets sur 2 mois >= 4)
```

### Mode de transport (si éligible)

```
mode =
  si autonomie . position allongée, surveillance ou conditions stériles : "ambulance"
  sinon si (autonomie . aide technique ou tierce personne
            OU autonomie . risque d'effets secondaires pendant le trajet) : "TAP (taxi/VSL)"
  sinon : "véhicule personnel / transports en commun"
```

### Accord préalable

```
accord préalable requis =
  situation . distance aller > 150
  OU (situation . distance aller > 50 ET situation . nombre de trajets sur 2 mois >= 4)
```

Note : `situation . ALD . statut` (exonérante / non exonérante) est capturé
mais n'influence pas l'éligibilité ni le mode en V1 — réservé pour une V2
sur les taux de remboursement.

## Résultat affiché

- Éligibilité (oui/non)
- Mode de transport recommandé (si éligible)
- Accord préalable requis (oui/non)
- Détail complet de l'évaluation : pour chaque règle (`éligible`, `mode`,
  `accord préalable requis`), affichage de l'arbre de décision publicode
  (règles déclenchantes, valeurs des variables intermédiaires)

## Architecture

`apps/simulateur-transport/`

- `regles/`
  - `situation.publicodes`
  - `autonomie.publicodes`
  - `eligibilite.publicodes`
  - `mode-transport.publicodes`
  - `accord-prealable.publicodes`
- UI : React + `@publicodes/react-ui` — formulaire auto-généré à partir
  des règles ci-dessus + page de résultat affichant l'éligibilité, le
  mode, l'accord préalable et l'explication détaillée via le moteur
  publicode
