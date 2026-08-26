# Précédents d'intégration

Ce que les intégrations passées ont appris, tenu hors du mode d'emploi parce que
c'est daté. À relire au besoin, pas à suivre à la lettre.

## Les commits

| Version | Commits |
|---|---|
| v9.4.1 | `128bbfa`, un seul commit |
| v9.5.0 | `afc1052`, `1914314`, `1de1038`, `7bc16d7` |

La v9.5.0 a demandé quatre intentions : le portage du modèle, la recette portée,
les contenus rendus, le README mis à l'heure.

## Le seul correctif local

Un correctif local du modèle a existé une fois, en v9.1. Il a été retiré dès que
l'éditeur a corrigé (`f4da5b7`). C'est le seul précédent, et il ne fait pas
jurisprudence.

## Ce que la v9.5.0 a déplacé dans le contrat

- `p1_m0_smur` supprimée du modèle ;
- `p2_accompagnement_tiers` et `p2_convocation_ou_avis` devenues calculées ;
- `cible_nombre_transports_prevus` et `cible_ald_reconnue_liee_aux_soins`
  nouvellement consommées.

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
