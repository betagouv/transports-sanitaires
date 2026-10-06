# AGENTS.md - simulateur-eligibilite

> Les conventions du dépôt sont dans [`../../AGENTS.md`](../../AGENTS.md). Ici,
> ce qui est propre à cette app.

## Ce que c'est

Le simulateur d'éligibilité au transport sanitaire. Sa pile :

- React 19 + Vite + DSFR (`@codegouvfr/react-dsfr`) ;
- un questionnaire **déclaré par l'application** (`front/simulateur/questionnaire/`).

**L'app est entre deux modèles.** Le modèle v9 et ce qui en dépendait sont retirés,
la v10 n'est pas intégrée. Il n'y a ni règles publicodes, ni page de résultat métier,
ni CERFA téléchargeable. Le simulateur déroule un **parcours factice**
(`front/simulateur/parcours-factice.ts`), qui ne décide rien. Le
[README](README.md) § « Entre deux modèles » dit ce qui est parti et ce qui reste.

Le parcours commence par un **écran-porte de rattachement
obligatoire** : établissement et service, sans identifier la personne
(`front/rattachement/`, référentiel Grist). Le tout est servi par
un **backend Node/Express** (`server/` : le front et `/api/*`) déployé sur
**Scalingo**. Ce n'est pas un site statique.

## Le questionnaire

Trois fichiers portent la mécanique, dans `front/simulateur/questionnaire/` :

| Fichier | Ce qu'il porte |
|---|---|
| `question.ts` | ce qu'est une question, une page, une réponse |
| `passation.ts` | l'état d'un parcours : page ouverte, brouillon, navigation |
| `invalidation.ts` | ce qu'une réponse changée efface |

Quatre règles à tenir en ajoutant une question :

- **Une condition d'affichage s'écrit dans `poseeSi`.** Jamais dans un composant.
- **Une dépendance se déclare dans `dependDe`.** Sans elle, la réponse survit au
  changement de celle dont elle dépend.
- **Une saisie ne compte qu'une fois la page validée.** Le brouillon vit dans
  `passation.ts`, pas dans le champ.
- **Le verrou est un montage, pas un drapeau.** Ce qui vient après le verrou est un
  second `Parcours`, qui reçoit `reponsesAcquises` et ne repose rien
  (`front/simulateur/Simulateur.tsx`).

*Gardé par* `tests/simulateur/`.

## Le socle PDF

`front/cerfa/` ne porte plus aucun formulaire. Il garde ce qui
ne dépend d'aucun gabarit :

| Fichier | Ce qu'il porte |
|---|---|
| `remplir-cerfa.ts` | l'écriture dans un AcroForm : textes, cases et leurs états d'export, refus de tronquer |
| `mesure-de-la-zone.ts` | un texte tient-il dans son champ, et à quelle taille |
| `debordement-du-texte.ts` | l'erreur levée quand il ne tient pas |
| `remplissage.ts` | la forme d'un tableau de remplissage : un champ, une ligne |
| `dates.ts` | une date sur un champ peigné |

Un formulaire rempli porte des données de santé nominatives. Il se génère **dans le
navigateur uniquement**, et ce dossier n'adresse jamais `/api`.

*Gardé par* `tests/cerfa/remplissage.test.ts`, sur un formulaire fabriqué, et par
`tests/architecture.test.ts`.

## Les trois racines de runtime

Découpage **par fonctionnalité**, à l'intérieur de trois racines :

| Racine | Ce que c'est |
|---|---|
| `front/` | le navigateur, bundlé par Vite |
| `server/` | le backend, qui détient la clé Grist |
| `shared/` | le contrat front ⇄ back, chargé des deux côtés |

Hors de ces racines, `cms/` porte le script collé dans Sites Conformes. Il s'exécute
sur les pages du CMS, pas dans l'app : il n'importe rien et n'est importé par
personne, ses tests le chargent comme texte.

À lire à côté :

- [`docs/knowledge/adr/identification.md`](docs/knowledge/adr/identification.md)
- [`docs/knowledge/adr/analytics.md`](docs/knowledge/adr/analytics.md)
- le [README](README.md), pour l'arborescence commentée

## Commandes

| Commande | Ce qu'elle fait |
|---|---|
| `pnpm verifier` | **À passer avant de dire que c'est fait.** lint → typecheck → knip → tests → build (+ vérification de bundle). Exactement ce que lance la CI. |
| `pnpm dev:front` | Serveur Vite, <http://localhost:5173> (proxy `/api` → `:3000`) |
| `pnpm dev:server` | Backend Express, <http://localhost:3000> |
| `pnpm start` | Serveur de production (`node server/server.ts`) |
| `pnpm lint:fix` | Applique tous les correctifs sûrs de Biome |

`pnpm build` enchaîne trois étapes :

1. `tsc -b` sur les quatre projets : front, node, serveur, tests ;
2. Vite ;
3. `verifier-bundle` : `pdf-lib` et le catalogue de seeds doivent rester hors du
   chunk d'entrée.

Si tu remplaces un `import()` par un import statique, c'est l'étape 3 qui te le
dit.

## Versions

`package.json` porte la version de l'app. Une livraison se marque par un tag
`simulateur-eligibilite@<version>` : le monorepo n'a pas de tag global. Ce
qu'elle apporte s'écrit dans [`CHANGELOG.md`](CHANGELOG.md), sous la forme d'un
TL;DR puis d'une ligne par commit, groupée par type.

Le pied de page du simulateur affiche deux valeurs : cette version et le commit
déployé. Voir le [README](README.md) § « Savoir
ce qui tourne ».

La marche à suivre est dans le skill `livrer-une-version`.

## Les invariants

Ils sont **exécutables**, dans
[`tests/architecture.test.ts`](tests/architecture.test.ts) :

- les frontières entre `front/`, `server/` et `shared/` ;
- le simulateur, qui ignore qui prescrit ;
- les outils produit, greffés sur le simulateur et jamais l'inverse ;
- le socle PDF, qui n'adresse jamais `/api` ;
- les règles publicodes, qui ne portent que de l'éligibilité (sans objet tant que
  `regles/` est vide) ;
- les limites de 30 et 300 lignes.

**Ne les recopie pas ici.** Lis le fichier. Lis surtout le message d'échec avant
de contourner une règle : il dit ce qu'elle protège.

## Pièges

**Extensions d'import.** Il en faut une (`.ts`) partout où Node peut atteindre le
fichier, et nulle part ailleurs dans `front/`.

| Emplacement | Extension |
|---|---|
| `server/`, `shared/`, `scripts/` | `.ts` |
| ce qu'un script tire dans `front/` | `.ts` |
| le reste de `front/` | aucune |

Node ne résout pas les extensions, Vite si. Ce n'est pas une affaire de dossier
mais d'accessibilité, et `tests/lisibilite.test.ts` la calcule.

**DSFR pour toute l'interface.** Emprunte la forme des props au composant appelé
(`ComponentProps<typeof Checkbox>`) plutôt que de la recopier. Une recopie dérive
d'une version à l'autre.

## Tests

**Sans mock.**

- Les tests d'interface passent Testing Library sur le vrai `<App />`.
- Les tests serveur font de vraies requêtes HTTP sur une app Express montée sur
  un référentiel injecté.
- Les tests du socle PDF remplissent un vrai PDF, fabriqué par `pdf-lib`.

Réutilise les helpers de `tests/` : `porte.ts`, `simulateur/parcours.tsx`,
`cerfa/formulaire-de-test.ts`, `rattachement/serveur-de-test.ts`.

**Une situation de référence va dans
[`front/outils-produit/seeds/catalogue.ts`](front/outils-produit/seeds/catalogue.ts),
pas dans un fichier de test.** C'est un catalogue unique de situations nommées,
*avec leurs sorties attendues*. Il est vide tant que le modèle suivant n'est pas
intégré. Les tests de la galerie écrivent leurs propres seeds, sur le parcours
factice.

## Les outils produit

La galerie de seeds et les **traces de debug** sont les deux outils produit. Ils
partagent :

- la même garde d'accès **sur tous les environnements** (service n° 4 du
  référentiel, `front/outils-produit/deverrouillage.ts`) ;
- le même moment : ils sont atteints **après** le rattachement.

Pas de conditionnement sur `import.meta.env.DEV`.

Le simulateur ne connaît pas la galerie. C'est `App.tsx` qui lui passe du contenu
déjà composé (`panneauOutilsProduit`).

Les traces, elles, vivent dans le simulateur : elles lisent l'état vivant du
parcours, qu'`App` n'a pas sous la main. Ce n'est donc pas un contenu composé qui
descend, mais le booléen `traceDebug`, jusqu'au prop obligatoire `autorisee` des
deux composants de trace. Obligatoire pour qu'aucun appelant ne puisse en rendre
une sans avoir dit à qui elle s'ouvre.
