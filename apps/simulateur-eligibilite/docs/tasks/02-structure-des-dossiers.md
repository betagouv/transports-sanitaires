# 02: Structure des dossiers

**What to build:** une arborescence où l'on voit d'un coup d'œil ce qui est le
socle et ce qui est la version. Un changement de version ne touche qu'un
dossier.

**Blocked by:** aucun.

**Status:** fait. Les deux gardes socle/modèle sont écrites (381090c). La troisième attend que le factice quitte `front/model/`.

## Décisions prises

- **D-02** `front/socle/` pour le socle, `front/model/` pour la version.
- **D-03** Les règles publicodes vont dans `front/model/rules/`.
- **D-28** Les tests se rangent en `tests/socle/` et `tests/model/`.
- **D-29** Le modèle importe le socle par un point d'entrée unique,
  `front/socle/index.ts`.
- **D-30** Le déplacement se fait maintenant, en un commit sans changement de
  comportement. Le factice et le catalogue des seeds vont dans `front/model/`.
  Les gardes arrivent avec l'injection du modèle (chantiers 06 et 08), car
  `Simulateur` importe encore le factice.
- **D-31** Le parcours et le moteur de questionnaire sont deux dossiers
  frères : `front/socle/simulateur/` et `front/socle/questionnaire-engine/`.
- **D-32** « Moteur » seul reste au moteur de décision. Le moteur de
  questionnaire est toujours qualifié.
- **D-33** `front/socle/index.ts` expose ce dont le reste de l'app a besoin,
  seeds exceptées.
- **D-34** Les tests du serveur vont dans `tests/socle/`.

## Proposé, à confirmer

```
front/Main.tsx       seul fichier à importer le socle et le modèle
front/socle/         app, rattachement, simulateur, questionnaire-engine,
                     analytics, seeds, cerfa, developerTools, ui
front/model/         déclarations, parties, faits, cibles, résultats,
                     mapping cerfa, seeds
front/model/rules/   les règles publicodes
tests/socle/         les tests du socle, serveur compris
tests/model/         les tests de la version
```

- `server/` et `shared/` ne bougent pas : ils ne portent que le rattachement,
  donc du socle.
- Trois gardes dans `tests/architecture.test.ts` :
  1. seul `front/Main.tsx` importe `front/model/` ;
  2. `front/model/` n'importe du socle que `front/socle/index.ts` ;
  3. seuls `tests/model/` et le test de conformité importent `front/model/`.
- `front/socle/index.ts` ne réexporte ni l'écran des seeds ni son tableau, pour
  qu'ils restent hors du chunk d'entrée. `verifier-bundle` le vérifie déjà.
- `architecture.test.ts`, `lisibilite.test.ts` et
  `recette-sans-version.test.ts` restent à la racine de `tests/` : ils portent
  sur tout le dépôt de l'app.

## Ce qui reste

- Les trois gardes, quand `Simulateur` et l'écran des seeds recevront le
  modèle au lieu de l'importer.
- `front/model/rules/` n'existe pas encore : il arrive avec la v10.

## Questions ouvertes

1. **Le type `Seed`.** `index.ts` l'exporte aujourd'hui pour le catalogue du
   modèle. D-33 exclut les seeds : le catalogue importe-t-il alors `Seed`
   directement depuis `front/socle/seeds/` ?
2. **`Main.tsx`** importe encore `App` et le traceur par leurs chemins. Il
   passera par `index.ts` quand le contrat sera écrit.

## Fichiers qui citent les anciens chemins

À mettre à jour dans le même commit : `tests/architecture.test.ts`,
`tests/lisibilite.test.ts`, `scripts/verifier-bundle.ts`, `biome.jsonc`,
`cms/statistiques-simulateur.js`, `shared/referentiel.ts` (un commentaire),
`AGENTS.md` et `README.md` de l'app, les deux ADR. C'est fait. La spec en
brouillon 002 décrit l'arborescence de la v9 et n'a pas été touchée.

Quatre skills citent aussi ces chemins, mais décrivent encore la v9 :
`implement-publicodes-version`, `regle-publicodes`, `livrer-une-version`,
`situation-de-reference`. Leur réécriture relève du chantier 10.

## Critères d'acceptation

- [x] Tout le code du front est sous `front/socle/` ou `front/model/`, sauf
      `Main.tsx`.
- [x] Deux gardes sur trois sont des tests, avec leur pourquoi dans le message
      d'échec. La troisième (seuls les tests du modèle importent le modèle)
      attend.
- [x] `pnpm verifier` est vert, et le catalogue des seeds reste hors du chunk
      d'entrée.
