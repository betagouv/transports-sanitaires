# 08: Tests et factice

**What to build:** des tests du socle qui ne changent pas quand la version
change, et des tests du modèle qui ne dépendent pas du socle au-delà du contrat.

**Blocked by:** 02 (les dossiers), 03 (le contrat).

**Status:** fait. Reste la migration du factice, avec la v10.

## Décisions prises

- **D-49** Dans le factice, « Rien » ne donne aucun cerfa.
- **D-50** L'avertissement du factice disparaît de l'écran.
- **D-52** Le factice reste dans `front/model/` jusqu'à la v10. À son
  intégration, il migre dans `tests/socle/fixtures/`. D'ici là, les tests du
  socle le prennent par `tests/socle/modele-de-test.ts`.
- **D-58** Le test de conformité s'écrit maintenant, sur le factice.
- **D-59** Un fichier de `front/model/` ne porte pas de version dans son nom.

## Ce qui est fait

- `App` reçoit le modèle en prop. Les tests du socle injectent le factice.
- Un seul fichier de `tests/socle/` importe `front/model/` :
  `modele-de-test.ts`. Une garde d'architecture l'impose.
- Le factice est écrit dans le contrat, avec ses déclarations.
- `tests/model/conformite.test.ts` vérifie le modèle livré (dfc9ccd) :
  identifiants de question et de page uniques, dépendances vers des questions
  qui existent, seeds rejouées sans écart.
- `recette-sans-version` couvre aussi les noms de fichiers de `front/model/`.

## Ce qui reste, avec la v10

- Migrer le factice dans `tests/socle/fixtures/` (D-52), et repointer
  `modele-de-test.ts`.
- Le test de conformité tournera alors sur le modèle v10. Faut-il qu'il tourne
  aussi sur le factice ?
- Les tests propres à la v10 : l'oracle, le mapping des cerfa.

## Questions ouvertes

Aucune.

## Critères d'acceptation

- [x] Aucun test du socle n'importe `front/model/`, hors `modele-de-test.ts`.
- [ ] Remplacer le modèle livré ne fait rougir aucun test du socle. À
      constater à l'intégration de la v10.
- [x] Le test de conformité passe sur le factice.
