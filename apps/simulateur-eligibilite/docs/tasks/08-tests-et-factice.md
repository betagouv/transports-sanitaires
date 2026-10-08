# 08: Tests et factice

**What to build:** des tests du socle qui ne changent pas quand la version
change, et des tests du modèle qui ne dépendent pas du socle au-delà du contrat.

**Blocked by:** 02 (les dossiers), 03 (le contrat).

**Status:** fait.

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

## Fait avec l'étape 1 de la v10

- Le factice a migré dans `tests/socle/fixtures/modele-factice/` (D-52).
  `modele-de-test.ts` le réexporte.
- Deux gardes d'architecture : seuls les tests du modèle importent le modèle
  livré, et les tests du socle ne prennent leur modèle que par
  `modele-de-test.ts`.
- Le test de conformité tourne sur le modèle v10.

## Ce qui reste

- Faut-il que le test de conformité tourne aussi sur le factice ?
- Le test du mapping des cerfa, aux étapes 6 et 7 du chantier 10.

## Questions ouvertes

Aucune.

## Critères d'acceptation

- [x] Aucun test du socle n'importe `front/model/`, hors `modele-de-test.ts`.
- [x] Remplacer le modèle livré ne fait rougir aucun test du socle. Constaté
      à l'étape 1 de la v10 : aucun test du socle n'a changé.
- [x] Le test de conformité passe sur le factice.
