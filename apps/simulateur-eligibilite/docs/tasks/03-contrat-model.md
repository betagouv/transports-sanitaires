# 03: Contrat `Model`

**What to build:** le type que le socle attend d'une version. Il est assez
précis pour que le socle déroule le parcours seul, et assez stable pour ne pas
changer quand l'éditeur livre de nouvelles questions, règles ou formulaires.

**Blocked by:** 01 (les noms).

**Status:** écrit dans `front/socle/model.ts` (381090c).

## Décisions prises

- **D-04** La v10 est la seule référence de structure.
- **D-08** Deux résultats : R2 après P2, R3 (le cerfa) après le questionnaire
  entier. `completion` est abandonné.
- **D-09** Le premier résultat a pour clé `transportAndEligibility`.
- **D-10, D-13** Les génériques s'appellent `Questions`, `Faits`, `Cibles`.
- **D-37** `preconisation` porte deux fonctions, `faits` puis `cibles`. La
  trace de debug montre les faits.
- **D-38** `Questions` déclare les questions du modèle, avec le type de chaque
  réponse. `Answers<Questions>` désigne les réponses données à un instant. Le
  socle garde `Answer`, `Answers`, `lockedAnswers`, `seedAnswers`.
- **D-11, D-16** La Préconisation aboutit à R2 puis à R3.
- **D-17** Les composants de R2 et R3 s'appellent `Resultat`.
- **D-18** Le second résultat a pour clé `cerfa`, S3141 compris.
- **D-35** La clé `preconisation` reste. Elle contient ce qui calcule la
  préconisation, pas la préconisation elle-même.
- **D-36** Le modèle fournit en champs les libellés des trois actions propres
  à la version (`printLabel`, `startLabel`, `downloadLabel`). Le socle rend
  tous les boutons et garde les libellés de navigation.

## Quand la préconisation est calculée

| Moment | Qui appelle | Pourquoi |
|---|---|---|
| Fin de P2 | le socle | afficher R2 |
| Retour depuis R2, puis nouveau passage à R2 | le socle | recalculer : rien n'est figé |
| Verrou | le socle | figer les cibles, choisir le formulaire, ouvrir P3 |
| Pendant P3 et à R3 | personne | les cibles sont figées |
| Écran des seeds | le socle | rejouer chaque seed |
| Trace de debug | le socle | montrer ce qui a été calculé |

Pendant P0 à P2, une question peut dépendre d'un calcul intermédiaire (Q2.3.4
n'est posée que si une DAP est requise). Le modèle appelle alors ses règles
dans le `askedIf` de la question, sans passer par le socle.

## Le contrat arbitré

```ts
/** Les réponses données à un instant. Il peut en manquer. */
type Answers<Questions extends AnyQuestions = AnyQuestions> = Partial<Questions>;

export type Model<Questions extends AnyQuestions, Faits, Cibles> = {
  /** Ce qui calcule la préconisation : des réponses aux faits, des faits aux cibles. */
  preconisation: {
    faits: (answers: Answers<Questions>) => Faits;
    cibles: (faits: Faits) => Cibles;
  };
  /** Résultat R2, après P0 à P2 : transport préconisé et éligibilité. */
  transportAndEligibility: {
    parts: readonly QuestionnairePart<Questions>[];
    Resultat: ComponentType<{ answers: Answers<Questions>; cibles: Cibles }>;
    printLabel: string;
  };
  /** Résultat R3, après P3 : le cerfa. N'existe que si la préconisation en donne un. */
  cerfa: {
    part: QuestionnairePart<Questions>;
    form: (cibles: Cibles) => CerfaForm<Questions, Cibles> | null;
    Resultat: ComponentType<{ answers: Answers<Questions>; cibles: Cibles }>;
    startLabel: string;
    downloadLabel: string;
  };
  seeds: () => Promise<readonly Seed<Questions, Cibles>[]>;
};

type CerfaForm<Questions, Cibles> = {
  template: string;
  mapping: FieldMapping<{
    answers: Answers<Questions>;
    cibles: Cibles;
    completedAt: Date;
  }>;
};
```

## Écarts entre le contrat arbitré et le code

- **`title`** s'ajoute à chaque partie et à chaque résultat (D-48).
- **`askedIf`** est écrit en méthode, et `defineModel` efface les types (D-55).
  Le socle reste sans générique : le typage protège le modèle, pas les appels
  du socle.
- **Quatre champs ne sont pas encore lus** par le socle : `printLabel`,
  `downloadLabel`, `template`, `mapping` (D-53).
- **`AnyFaits`** borne le générique `Faits`, pour que la trace sache l'afficher.

## Questions ouvertes

1. **`cibles` synchrone.** À vérifier en écrivant la preuve Q2.1 : elle ne
   doit lire que la sélection Q2.1 (15 Ko), pas l'index CCAM (3 Mo).

## Critères d'acceptation

- [x] Le type est écrit dans le socle et ne cite aucun nom de la v10.
- [ ] Le factice et la v10 s'écrivent tous deux dans ce type, sans le modifier.
- [ ] Chaque champ a une raison lisible dans le parcours de la v10.
