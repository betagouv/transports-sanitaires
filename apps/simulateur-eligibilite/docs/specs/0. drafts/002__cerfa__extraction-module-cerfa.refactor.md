# Extrait un module `cerfa` du remplissage des trois documents

| Champ       | Valeur      |
|-------------|-------------|
| id          | `002`       |
| module      | cerfa       |
| type        | refactor    |
| bloquée par | —           |

## Problem Statement

Le remplissage des trois Cerfa (PMT, DAP, S3141) vit aujourd'hui sous
`front/outils-produit/beta/cerfa/` — dans l'arborescence des **outils
produit**, derrière leur garde d'accès commune (service n° 4 du référentiel)
et sous un dossier `beta/` justifié, d'après `AGENTS.md`, par son bouton de
téléchargement plutôt que par sa nature :

> Le dossier est sous `beta/` à cause de son bouton de téléchargement, pas de
> sa nature. Il reste réservé aux outils produit tant que le pré-remplissage
> n'est pas éprouvé.

Contrairement à la galerie de seeds ou au labo — de vrais outils de
développement/démo —, le remplissage des Cerfa est une capacité produit :
c'est ce que le prescripteur télécharge à la fin du parcours. Le faire
cohabiter avec des outils expérimentaux dans la même arborescence brouille la
distinction que le reste du dépôt entretient ailleurs (`docs/knowledge`
distingue déjà « outils produit » et capacités du simulateur).

## Solution

Extraire `front/outils-produit/beta/cerfa/` en un module `cerfa` à part,
responsable du remplissage des trois documents (PMT, DAP, S3141), sans
changer ce que fait le remplissage lui-même.

## Implementation Decisions

Rien n'est tranché à ce stade — section à construire en `/grill-with-docs`
lors du passage en spec. Ce que l'exploration de la session précédente
(refactor de `secretariat/`) a déjà établi sur l'existant, pour cadrer la
discussion :

- Structure actuelle de `front/outils-produit/beta/cerfa/` : trois
  sous-dossiers par formulaire (`pmt/`, `dap/`, `s3141/`, chacun avec son
  `remplissage-<forme>.ts`), et un socle partagé (`mapping.ts`,
  `remplir-cerfa.ts`, `dates.ts`, `reponses.ts`, `document.ts`,
  `documents.ts`, `cerfa-non-applicable.ts`, `elements-medicaux/`).
- Le module lit en direct `front/simulateur/secretariat/case-de-formulaire.ts`,
  `date-de-prescription.ts` et `secretariat/rubriques/rubriques-*.ts` (la
  transcription du mapping documentaire) — cf. spec 001, déjà en place.
- `tests/architecture.test.ts` fait respecter aujourd'hui : le CERFA
  n'adresse jamais `/api` ; les outils produit se greffent sur le simulateur,
  jamais l'inverse (`front/simulateur` n'importe jamais
  `front/outils-produit/`).
- `scripts/verifier-bundle.ts` exige que `pdf-lib` et le catalogue de seeds
  restent hors du chunk d'entrée — contrainte à préserver quel que soit le
  nouvel emplacement.

Questions ouvertes, à trancher avant la spec :

1. Nouvel emplacement : `front/cerfa/`, racine à part entière au même niveau
   que `front/simulateur/`, `front/identification/`, `front/outils-produit/ ?
   Autre chose ?
2. La garde d'accès (service n° 4 du référentiel, atteint seulement après
   identification) reste-t-elle, ou l'extraction change-t-elle aussi ce
   qu'on protège et pourquoi ?
3. Le statut « beta » (bouton de téléchargement) suit-il le module, ou
   l'extraction est-elle justement le moment où le pré-remplissage devient
   « éprouvé » au sens de la phrase d'`AGENTS.md` citée plus haut ?
4. `elements-medicaux/` suit-il tel quel, ou sa relation avec
   `docs/knowledge/domain/composer-les-elements-medicaux.md` doit-elle être
   revue ?
5. Le sens de dépendance vers `secretariat/case-de-formulaire.ts` et
   `secretariat/rubriques/` change-t-il (le nouveau module continue-t-il de
   lire depuis `simulateur/secretariat/`, ou une partie de cette
   transcription doit-elle migrer avec `cerfa/`) ?
6. `tests/architecture.test.ts` : quelles règles remplacer, ajouter ou
   retirer pour refléter la nouvelle frontière ?
7. Faut-il aussi renommer/déplacer `tests/cerfa/` en conséquence ?

## Testing Decisions

Non discuté — à construire en spec. Attendu a minima : aucun changement de
comportement, la suite de tests existante sert de filet (même logique que la
spec 001).

## Out of Scope

Non discuté.

## Further Notes

Brouillon issu d'une demande directe (`/to-draft`), sans exploration du code
au-delà de ce qui était déjà connu de la session précédente (spec 001,
réorganisation de `front/simulateur/secretariat/`). À affiner avec
`/to-spec` : exploration du code, `/grill-with-docs` sur les questions
ci-dessus, sketch des seams de test.
