# 07: Seeds

**What to build:** des seeds qui appartiennent au modèle et que le socle sait
rejouer, afficher et ouvrir, sans connaître leur contenu.

**Blocked by:** 03 (le contrat), 04 (les déclarations).

**Status:** fait. Reste une seed par cas d'oracle, avec la v10.

## Décisions prises

- **D-12** Ce qu'une seed attend s'exprime en Cibles. `Outputs` disparaît.
- **D-51** Le catalogue du modèle lit le type `Seed` dans
  `front/socle/seeds/seed`.
- **D-54** Le catalogue est chargé par un effet.
- **D-56** Une seed ne déclare pas où elle s'ouvre. Le parcours le déduit de
  ses réponses, verrou compris. Le champ `landing` a disparu.
- **D-57** À l'intégration de la v10, une seed par cas de l'oracle.

## Proposé, à confirmer

- La mécanique reste au socle : le type `Seed`, l'évaluation, l'écran, le
  tableau.
- Le catalogue va dans le modèle. Le contrat l'expose par `seeds()`, chargé à
  la demande pour rester hors du chunk d'entrée.
- Une seed est typée par le modèle : `Seed<Questions, Cibles>`.
- Les renommages : `SeedEvaluation.outputs` et `SeedMismatch.output` suivent
  « cibles », et la trace de debug affiche « Cibles décidées ».

## Ce qui est fait

- `Seed<Questions, Cibles>` est typée par le modèle.
- Le catalogue vit dans le modèle, qui le charge à la demande par `seeds()`.
- `Outputs` a disparu : `SeedEvaluation.cibles`, `SeedMismatch.cible`, et la
  trace affiche « Cibles décidées ».
- L'écran reçoit le modèle et rejoue chaque seed dans sa préconisation.

## Ce qui reste

- **Une seed par cas de l'oracle** (D-57), à écrire avec la v10. Chaque seed
  cite son cas. Un test vérifie que ses réponses donnent les faits du cas.
  L'oracle est écrit en faits dans `tests/test_publicode.mjs` du livrable : il
  part de faits tous à « non » et en change quelques-uns par cas.

## Questions ouvertes

Aucune. Les seeds par cas d'oracle attendent l'oracle écrit en réponses, que
l'éditeur prépare : les 25 cas actuels sont en faits, et tous s'appuient sur un
fait que le livrable ne permet pas de déduire d'une réponse.

## Critères d'acceptation

- [x] L'écran des seeds affiche le catalogue du modèle injecté.
- [x] `verifier-bundle` confirme que le catalogue reste hors du chunk d'entrée.
- [x] Le socle ne contient plus aucune seed.
