# 05: Questionnaire en parties

**What to build:** un questionnaire déclaré par parties (P0 à P3), comme dans le
livrable. Le stepper compte les parties.

**Blocked by:** 01 (les noms).

**Status:** fait. Une partie a un `title` depuis 381090c (C-1), et `askedIf` reçoit les cibles après le verrou.

## Décisions prises

- **D-06** P0 à P3 sont des `QuestionnairePart`, pas des pages.
- **D-13, D-38** Le générique du modèle s'appelle `Questions`. Le socle garde
  `Answer`, `Answers`, `lockedAnswers`, `seedAnswers` : aucun renommage chez lui.
- **D-26** `Page` reste le nom d'un écran de questions dans une partie.
- **D-43** `QuestionnairePart` s'écrit maintenant, sur le factice.
- **D-44** En P3, `askedIf` reçoit les cibles figées au verrou :
  `askedIf(answers, cibles)`. Le modèle ne recalcule rien. À écrire avec le
  chantier 06, quand le parcours aura des cibles à passer.

## Ce qui est fait

```ts
type QuestionnairePart = {
  id: string;
  pages: readonly Page[];
};
```

- Une partie contient ses pages. `Page.part` et `PART_COUNT` ont disparu : le
  rang vient de l'ordre des parties, le total de leur nombre.
- `QuestionnaireForm` reçoit `parts`, et `partsBefore` quand un questionnaire
  en suit un autre.
- Le factice a deux parties, une de chaque côté du verrou.
- Le générique `Questions` n'y est pas encore : il arrive avec le contrat.

## Questions ouvertes

1. **Le titre des parties.** Le livrable ne demande pas de l'afficher dans le
   stepper. Une partie a pourtant un `title` : le socle en fait le `h1` de ses
   pages (C-1, à confirmer).

## Critères d'acceptation

- [x] Le factice est déclaré en parties.
- [x] Le stepper affiche le même libellé qu'aujourd'hui.
- [x] Les tests de navigation passent sans changer leurs attendus.
