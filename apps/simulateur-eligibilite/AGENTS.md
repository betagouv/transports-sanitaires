# AGENTS.md — simulateur-eligibilite

> Les conventions du dépôt sont dans [`../../AGENTS.md`](../../AGENTS.md). Ici,
> ce qui est propre à cette app.

## Ce que c'est

Le simulateur d'éligibilité au transport sanitaire. React 19 + Vite + DSFR
(`@codegouvfr/react-dsfr`), moteur de règles **`publicodes`** (un seul fichier,
`regles/regles.publicodes`) et `@publicodes/forms`, dont le `FormBuilder`
engendre le formulaire à partir des règles.

Le parcours commence par un **écran-porte d'identification du prescripteur
obligatoire** (`front/identification/`, référentiel Grist). Le tout est servi par
un **backend Node/Express** (`server/` : le front et `/api/*`) déployé sur
**Scalingo**. Ce n'est pas un site statique.

À la fin du parcours, `front/outils-produit/beta/cerfa/` remplit les CERFA
officiels (AcroForm, `pdf-lib`) **dans le navigateur uniquement**. Ces
formulaires portent des données de santé nominatives : aucun document rempli ne
doit atteindre le backend. Un sous-dossier par formulaire, gabarit compris —
`pmt/` pour la prescription médicale de transport (n° 11574*07, réf. S3138g),
`dap/` pour la demande d'accord préalable (n° 11575*08, réf. S3139h). Ce qu'ils
partagent (l'écriture dans le PDF, la lecture du modèle, la forme d'un tableau)
est d'un cran au-dessus, dans `cerfa/`.

**Chaque champ du PDF est une clé du tableau de remplissage**, et sa valeur une
fonction des réponses de la simulation. Tous les champs y sont, y compris ceux
qu'on ne déduit pas : leur ligne dit alors qui les remplira, et pourquoi. Un test
confronte chaque tableau à son gabarit, donc aucun champ ne peut être oublié ni
inventé. C'est volontairement coûteux — le moteur est relu champ par champ — et
volontairement lisible : une case du formulaire se comprend en lisant sa ligne.
Le dossier est sous `beta/` parce que son bouton de téléchargement est réservé
aux outils produit tant que le pré-remplissage n'est pas éprouvé, pas à cause de
sa nature.

## Les trois racines de runtime

Découpage **par fonctionnalité**, à l'intérieur de trois racines :

- `front/` — le navigateur, bundlé par Vite ;
- `server/` — le backend, qui détient les secrets ;
- `shared/` — le contrat front ⇄ back, chargé des deux côtés.

Voir [`docs/architecture/identification.md`](../../docs/architecture/identification.md)
et [`analytics.md`](../../docs/architecture/analytics.md), et le
[README](README.md) pour l'arborescence commentée.

## Commandes

| Commande | Ce qu'elle fait |
|---|---|
| `npm run verifier` | **À passer avant de dire que c'est fait.** lint → typecheck → knip → validation des règles → tests → build (+ vérification de bundle). Exactement ce que lance la CI. |
| `npm run dev:front` | Serveur Vite, <http://localhost:5173> (proxy `/api` → `:3000`) |
| `npm run dev:server` | Backend Express, <http://localhost:3000> |
| `npm start` | Serveur de production (`node server/server.ts`) |
| `npm run valider-regles` | Syntaxe YAML puis compilation publicodes |
| `npm run apercu-cerfa` | Engendre un CERFA de contrôle. C'est aussi ce qui casse quand une extension d'import manque. |
| `npm run lint:fix` | Applique tous les correctifs sûrs de Biome |

`npm run build` enchaîne `tsc -b` (les quatre projets : front, node, serveur,
tests), Vite, puis `verifier-bundle` : `pdf-lib` et le catalogue de seeds doivent
rester hors du chunk d'entrée. Si tu remplaces un `import()` par un import
statique, c'est ce qui te le dit.

## Versions

`package.json` porte la version de l'app. Une livraison se marque par un tag
`simulateur-eligibilite@<version>` (le monorepo n'a pas de tag global), et ce
qu'elle apporte s'écrit dans [`CHANGELOG.md`](CHANGELOG.md) : un TL;DR, puis une
ligne par commit, groupée par type. Le pied de page du simulateur affiche cette
version, le commit déployé et la version du modèle de règles — voir le
[README](README.md) § « Savoir ce qui tourne ».

La marche à suivre est dans le skill `livrer-une-version`.

## Les invariants

Ils sont **exécutables**, dans [`tests/architecture.test.ts`](tests/architecture.test.ts) :
frontières entre `front/`, `server/` et `shared/` ; le simulateur qui ignore qui
prescrit ; les outils produit greffés sur le simulateur et jamais l'inverse ; le
CERFA qui n'adresse jamais `/api` ; les règles publicodes qui ne portent que de
l'éligibilité ; les limites de 30 et 300 lignes.

**Ne les recopie pas ici.** Lis le fichier, et surtout lis le message d'échec
avant de contourner une règle : il dit ce qu'elle protège.

## Publicodes

- Les clés de règle se séparent par ` . `, les valeurs d'`une possibilité`
  s'écrivent entre quotes (`"'valeur'"`), les booléens sont `oui` / `non`. Une
  situation passée au moteur doit employer les clés exactes : une clé inconnue
  lève.
- **Les noms de règles passent par le contrat.**
  [`front/simulateur/contrat-regles-publicodes.ts`](front/simulateur/contrat-regles-publicodes.ts)
  liste toutes les clés que le code a le droit de nommer, et `Cible` comme
  `CleDeRegle` font rejeter le reste par TypeScript : dans un littéral de
  situation, dans un tableau `cibles`, dans un appel à `texte()` / `vrai()`. On
  lit une règle avec ces deux helpers, **jamais** avec un `engine.evaluate("…")`
  nu. Ajouter une clé au contrat est ce qui en autorise l'usage, et
  `tests/regles-front.test.ts` confronte le contrat au modèle.
- **Questions à choix multiple** : elles s'encodent en `mosaique`, soit N règles
  booléennes plus une règle parente inerte qui porte la métadonnée, consommée par
  `front/simulateur/questionnaire/mosaique.ts`. Le format exact est dans
  [`docs/specs/formalisation-mosaique-choix-multiple.md`](../../docs/specs/formalisation-mosaique-choix-multiple.md).

## Pièges

- **`@publicodes/forms` + StrictMode** : `goToNextPage` et `handleInputChange`
  **mutent** leur argument. N'utilise pas la forme `setState(prev => …)` avec
  eux, passe le `formState` courant directement. Les tests rendent sans
  StrictMode, ils ne l'attraperont pas.
- **Extensions d'import** : `.ts` partout où Node peut atteindre le fichier
  (`server/`, `shared/`, `scripts/`, et la chaîne que `scripts/apercu-cerfa.ts`
  tire dans `front/`), rien ailleurs dans `front/`. Node ne résout pas les
  extensions, Vite si. Ce n'est pas une affaire de dossier mais d'accessibilité,
  et `tests/lisibilite.test.ts` la calcule.
- **DSFR pour toute l'interface.** Emprunte la forme des props au composant
  appelé (`ComponentProps<typeof Checkbox>`) plutôt que de la recopier : une
  recopie dérive d'une version à l'autre.

## Tests

**Sans mock.** Les tests de moteur pilotent le vrai `publicodes`, les tests
d'interface passent Testing Library sur le vrai `<App />`, et les tests serveur
font de vraies requêtes HTTP sur une app Express montée sur un référentiel
injecté. Réutilise les helpers de `tests/` (`porte.ts`, `simulateur/moteur.ts`,
`simulateur/parcours.ts`, `identification/serveur-de-test.ts`).

**Une situation de référence va dans
[`front/outils-produit/seeds/catalogue.ts`](front/outils-produit/seeds/catalogue.ts),
pas dans un fichier de test.** C'est un catalogue unique de situations nommées
*avec leurs cibles attendues*, écrites en publicodes nu pour rester lisibles par
Node. Il est rejoué par la matrice de non-régression métier, parcourable dans la
galerie de seeds, et utilisé par `npm run apercu-cerfa`.

## Les outils produit

La galerie de seeds et le **labo** de règles sont les deux outils produit. Même
garde d'accès **sur tous les environnements** (service n° 4 du référentiel,
`front/outils-produit/deverrouillage.ts`), même panneau, tous deux atteints
**après** l'identification. Pas de conditionnement sur `import.meta.env.DEV`.

Le simulateur ne les connaît pas : c'est `App.tsx` qui lui passe du contenu déjà
composé (`panneauOutilsProduit`, `documentTelechargeable`). Une seule exception,
assertée nommément pour qu'elle ne puisse pas en engendrer une deuxième en
silence : `moteur.ts` demande à `labo/labo.ts` quelles règles charger.
