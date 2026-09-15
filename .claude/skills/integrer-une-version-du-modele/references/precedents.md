# Précédents d'intégration

Ce que les intégrations passées ont appris, tenu hors du mode d'emploi parce que
c'est daté. À relire au besoin, pas à suivre à la lettre.

## Les commits

| Version | Commits |
|---|---|
| v9.4.1 | `128bbfa`, un seul commit |
| v9.5.0 | `afc1052`, `1914314`, `1de1038`, `7bc16d7` |
| v9.6.0 | `18f42c9`, `7cef1ba`, `317e221`, `11624f4` |
| v9.7 | `a79c187`, `618b07d`, `8ce19db` |
| v9.7.1 | `68d422c` (refactor préalable), `360bd77`, `b2679f5`, `ffbaed1`, `2197661`, `cfec025`, `9b8db05` |

La v9.5.0 a demandé quatre intentions : le portage du modèle, la recette portée,
les contenus rendus, le README mis à l'heure — un gabarit que les versions
suivantes reprennent sans y être tenues. La v9.7.1 en a demandé sept : un
huitième cas final (orientation vers la caisse) et une mécanique de
requalification du trajet ont chacun mérité leur commit, en plus des
quatre habituels ; un refactor préalable (`68d422c`) a fait la place sous
300 lignes avant que le modèle recopié n'y ajoute un verdict.

## Le seul correctif local

Un correctif local du modèle a existé une fois, en v9.1. Il a été retiré dès que
l'éditeur a corrigé (`f4da5b7`). C'est le seul précédent, et il ne fait pas
jurisprudence.

## Ce que la v9.5.0 a déplacé dans le contrat

- `p1_m0_smur` supprimée du modèle ;
- `p2_accompagnement_tiers` et `p2_convocation_ou_avis` devenues calculées ;
- `cible_nombre_transports_prevus` et `cible_ald_reconnue_liee_aux_soins`
  nouvellement consommées.

## Ce que la v9.7.1 a ajouté au contrat

- `p2_convocation_plus_150km`, `p2_convocation_avion_bateau`,
  `p2_convocation_aucune` entrent dans `QUESTIONS` (mosaïque CONV-AP) ;
- `p2_convocation_caracteristiques_complet` entre dans `REGLES_LUES`, à côté
  des dix règles de complétude déjà présentes ;
- `p2_convocation` y entre aussi, mais pour une autre raison : pas pour
  décider du parcours (`etapes.ts` s'en tient à la règle de complétude
  ci-dessus), mais pour adapter deux libellés à l'écran (`label_when` du
  contrat d'interface, `ChampsDePage.tsx`) ;
- `cible_convocation_type` et `cible_orientation_caisse` existent dans le
  modèle mais n'ont pas rejoint `CIBLES` : rien dans le code ne les lit
  encore. Un rappel que la règle du § 4 va dans les deux sens — retirer une
  clé du contrat n'est pas qu'un geste de suppression, c'est aussi ne pas en
  ajouter une que le code n'emploie pas.

## L'anomalie convocation-lieu, corrigée sans le dire

`tmp/9.7/anomalie-v9-7-convocation-lieu.md` remontait qu'une convocation
réclamait encore le nom d'un lieu de départ qu'elle ne collecte pas — parce
que `cible_regime_financement` dépendait de variables de prescription
(`p2_transport_charge_etablissement`, `p2_permission_charge_patient`,
`p2_document_prescription_determine`) plutôt que de `cible_cas_final`
directement. La v9.7.1 la corrige, sans que le `CHANGELOG` ne le nomme : la
seule façon de le savoir a été de rejouer la seed `secretariat-convocation`
sans son contournement (`p2_depart_nom_lieu` factice) et de constater qu'elle
passait. **Une anomalie remontée reste à vérifier à chaque version
suivante**, même absente du changelog.

## Deux regex qui ont échoué loin de leur cause

En v9.5.0, `/^le patient/i` ne matchait plus « Concernant son déplacement, le
patient : ». Et `/entrée ou sortie d'hospitalisation/i` ne matchait plus « … d'une
hospitalisation ». D'où une réponse manquée, un parcours qui bifurque, et un test
qui échoue trois écrans plus loin.

## La réponse par défaut qui a tout cassé

La question A2.1, ajoutée en v9.5.0, offre huit réponses dont la première est une
convocation. La réponse par défaut de `tests/simulateur/parcours.ts` prend cette
première possibilité, ce qui concluait le parcours avant l'heure.

## L'anomalie remontée

`tmp/anomalie-v9-5-0-accompagnement.md` est le précédent dont le § 12 du mode
d'emploi reprend la structure. Le dossier `tmp/` n'est pas versionné : si le
fichier a disparu, le tableau des sections suffit.
