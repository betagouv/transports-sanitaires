# Simulateur d'éligibilité aux transports sanitaires — Spec

## Objectif

Permettre à un prescripteur (ou son personnel) de répondre à un questionnaire
sur la situation d'un patient et d'obtenir :

- **Statut** de la situation (`resultat . statut`) : éligible, éligible sous
  réserve d'accord préalable, convocation valant prescription, non éligible, ou
  situation hors parcours Assurance Maladie standard.
- **Document à établir** (`resultat . document`) : PMT (prescription médicale
  de transport), DAP (demande d'accord préalable), convocation/avis, procédure
  locale/établissement, ou aucun document Assurance Maladie.
- **Mode de transport** (`resultat . mode transport`) : ambulance, VSL/taxi
  TPMR, VSL/taxi conventionné, véhicule personnel/transport en commun, ou mode
  non justifié.
- **Messages patient** en trois niveaux (`resultat . patient . niveau 1/2/3`)
  et **aide prescripteur** (document à compléter, checklist, alertes).
- **Détail des règles évaluées** : trace de la décision (statut, document, mode).

Hors scope : pré-remplissage du document, calcul des frais kilométriques,
taux de remboursement.

Source des règles : référentiel CNAM
(https://www.ameli.fr/transporteur-sanitaire/exercice-professionnel/prescription-prise-charge).

## Modèle de questions

Le questionnaire est généré automatiquement par `@publicodes/forms` à partir des
cibles `resultat . statut`, `resultat . document` et `resultat . mode transport`.
Les questions applicables (et leur enchaînement) sont déduites des règles.

### Parcours médical

- `question 1 . situation particuliere` — aucune / SMUR / patient hospitalisé
  détenu / contrainte bariatrique uniquement / permission sans motif médical.
  Les situations SMUR et patient hospitalisé détenu conduisent à une situation
  hors parcours ; contrainte bariatrique et permission sans motif médical sont
  non éligibles.
- `question 2 . patient hospitalise` (si aucune situation particulière) et
  `question 2_1 . exception assurance maladie` (si hospitalisé) — les exceptions
  (retour USLD/EHPAD/HAD, radiothérapie en structure libérale, permission
  courte) restent prises en charge.
- `question 3 . motif principal` — convocation contrôle Sécurité sociale,
  CAMSP/CMPP, engagement maternité, SAMSAH, hospitalisation ou séance assimilée,
  accident du travail/maladie professionnelle, ALD reconnue, ambulance justifiée
  par l'état du patient, ou aucun.
- `question 4 . *` — lien du transport avec l'ALD, séance
  dialyse/radiothérapie/chimiothérapie, incapacité/déficience (validation ALD).
- `question 5 . *` — critères d'accord préalable (> 150 km, transports en série,
  avion/bateau de ligne, CAMSP/CMPP, maternité éloignée, SAMSAH) et
  `question 5_1 . *` (conditions détaillées des transports en série).
- `question 6 . *` — justification du mode de transport (ambulance, TPMR,
  VSL/taxi, individuel/commun) et `question 6_1` (incompatibilité transport
  partagé).

## Règles de décision (principales)

- `motif . permet poursuivre formulaire` : gate non circulaire (basé sur la
  sélection de motif + ALD validée) qui rend applicables les questions 5 et 6.
- `motif . ouvrant droit valide` : décision finale d'ouverture de droit (inclut
  `motif . ambulance valide` = motif ambulance **et** mode ambulance justifié).
- `ald . validee` : ALD reconnue + transport lié + (séance OU
  incapacité/déficience).
- `dap . necessaire` : ≥ 1 critère d'accord préalable rempli.
- `mode . principal` : ambulance > VSL/taxi TPMR > VSL/taxi conventionné >
  véhicule personnel/commun (priorité décroissante), sinon mode non justifié.
- `resultat . statut` puis `resultat . document` : dérivés des règles `sortie . *`
  dans l'ordre hors parcours → convocation → non éligible → éligible DAP →
  éligible PMT.

## Résultat affiché

- Bandeau de statut coloré (succès / info / avertissement / erreur) avec le
  message patient niveau 1 (titre) et niveau 2 (motif simplifié).
- Encart « Ce que vous devez faire » (niveau 3).
- Encart « Pour le prescripteur » : document à compléter + checklist
  (`checklist . texte document` / `checklist . texte mode`).
- Alerte de vigilance éventuelle (`resultat . prescripteur . alerte`) : SAMSAH,
  transports en série ne remplissant pas les conditions de DAP.
- Détail des règles évaluées (statut, document, mode).

## Architecture

`apps/simulateur-eligibilite/`

- `regles/regles.publicodes` — modèle complet (questions 1..6, motif, mode,
  DAP, alertes, résultat, checklist, sorties `interface . *`).
- UI : React + `@codegouvfr/react-dsfr` + `@publicodes/forms` — formulaire
  auto-généré (`FormBuilder`) et page de résultat.
  - `src/App.tsx` — pilotage du formulaire multi-pages.
  - `src/FormField.tsx` — rendu des champs (RadioGroup, select, nombre).
  - `src/Resultats.tsx` — page de résultat à partir des sorties du moteur.
  - `src/engine.ts` — chargement des règles et instanciation du moteur.
- Tests (`tests/`) : tests moteur (`resultat`, `dap`, `checklist-alerte`) sans
  mock + tests d'intégration UI (`App.test.tsx`).

## Limites connues

- Les libellés des options `une possibilité` (question 1, 2_1, 3) sont les
  identifiants bruts des règles (ex. `hospitalisation-ou-seance-assimilee`).
  Pour des libellés lisibles, ajouter des `titre` aux possibilités concernées
  dans le fichier de règles.
