# 04: Déclarations du modèle

**What to build:** un endroit unique où le modèle déclare ses questions, ses
faits, ses cibles et tout ce qui entre dans le questionnaire ou sa réponse. Un
nom mal écrit ne compile pas, et un nom absent des règles fait rougir un test.

**Blocked by:** 01 (les noms), 03 (les génériques).

**Status:** fait pour le factice, en types seuls (`front/model/declarations/`). Les listes `as const` et le test contre `rules/` viennent avec la v10.

## Décisions prises

- **D-07** Les déclarations sont explicites, et servent à typer précisément, à
  la place d'un `Record<string, unknown>`.
- **D-39** Elles vivent dans `front/model/declarations/` : `questions.ts`,
  `faits.ts`, `cibles.ts`.
- **D-40** Les questions portent les identifiants de l'éditeur : `Q1.1`,
  `Q2.3.4`.
- **D-41** Elles sont écrites à la main. Un test compare les faits et les
  cibles au YAML et au dictionnaire de l'éditeur.
- **D-70** Le dictionnaire de l'éditeur n'entre pas dans le dépôt. Le test
  compare au YAML seul : les 58 faits et les 44 cibles calculées. Les autres
  cibles sont comparées au package par un script local, à chaque livraison.
- **D-42** Deux déclarations de cibles dans `cibles.ts`. `Cibles` : ce qui
  fait la préconisation et que le verrou fige. `CiblesDocumentaires` : ce qui
  ne sert qu'à remplir le cerfa, calculé par le mapping à partir des réponses
  de P3 et des cibles figées.

## Proposé, à confirmer

- **Des valeurs, pas seulement des types.** Des listes `as const`, dont les
  types `Questions`, `Faits` et `Cibles` dérivent. Un test peut alors les
  comparer aux règles.
- **Ce qui est déclaré** : les questions et le type de leur réponse, les faits,
  les cibles, les neuf issues, les trois formulaires.
- **Un test** vérifie que chaque fait et chaque cible déclarés existent dans
  `rules/`, et l'inverse.
- **Le factice** a ses propres déclarations.

## Ce que le livrable fournit

- **Faits** : 58 dans le YAML. Un seul est typé (`fait_nombre_transports`, un
  nombre). Les autres sont des booléens par convention.
- **Cibles** : 89 dans le dictionnaire, qui est complet. 44 sont calculées par
  publicodes. 6 viennent de la preuve Q2.1 et de la trace, avant R2. Ces 50
  font la préconisation. Les 39 autres sont documentaires : elles viennent des
  réponses de P3, d'un « contexte fiable », ou de la date de complétion.
- **Questions** : 48, décrites seulement dans le catalogue en Markdown.

## Questions ouvertes

Aucune.

## Critères d'acceptation

- [ ] `Model<Questions, Faits, Cibles>` est typé par les déclarations.
- [ ] Un identifiant inconnu ne compile pas.
- [ ] Le test de correspondance avec `rules/` passe.
