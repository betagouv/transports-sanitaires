# Simulateur d'éligibilité aux transports sanitaires

Aide un **prescripteur hospitalier** à déterminer, via un questionnaire guidé, si le
transport d'un patient est **pris en charge par l'Assurance Maladie**, et ce qu'il doit
faire en conséquence : **document à établir** (prescription médicale de transport, série
de transports, accord préalable…) et **mode de transport** justifié. Les règles
d'éligibilité encodent la réglementation en vigueur ; le parcours débute par une
**identification du prescripteur obligatoire**.

## Fonctionnement

```mermaid
flowchart LR
    subgraph front["Front (navigateur)"]
        Ident["Identification"]
        subgraph simu["Simulateur — un moteur, deux outils"]
            Presc["Prescripteur<br/>Partie 1 → résultat médical"]
            Secr["Secrétariat<br/>Partie 2 → cas final"]
        end
        Cerfa["CERFA pré-rempli"]
        Analytics["Analytics"]
    end

    subgraph back["Backend (Node/Express)"]
        Ref["Référentiel"]
        Pseudo["Pseudonymisation"]
    end

    Grist[("Grist")]
    Matomo[("Matomo")]
    Patient(["Prescription complétée,<br/>signée, remise au patient"])

    Ident -->|"consulte"| Ref
    Ident -->|"pseudonymise l'identité"| Pseudo
    Ident -->|"identité validée"| simu
    Ident -->|"refs pseudonymisées"| Analytics
    Presc -->|"passation (situation P1)"| Secr
    Presc -->|"événements"| Analytics
    Secr -->|"événements"| Analytics
    Secr -->|"situation, si prescription"| Cerfa
    Cerfa -->|"PDF téléchargé"| Patient
    Ref -->|"lit"| Grist
    Analytics -->|"envoie"| Matomo

    classDef nominatif stroke-dasharray:4
    class Cerfa,Patient nominatif
```

Le **CERFA** n'a aucune flèche vers le backend, et c'est structurel : le prescripteur
y complète des données de santé nominatives, qui ne doivent jamais quitter le
navigateur (traits tiretés ci-dessus). Son téléchargement est par ailleurs réservé au service produit, et le gabarit comme
`pdf-lib` ne sont chargés qu'au clic.

## Commandes

- `npm run verifier` — **la vérification complète** : lint, typecheck, knip,
  validation des règles, tests, build (et sa vérification de bundle). C'est la
  commande que lance la CI, telle quelle : ce qui passe ici passe là-bas.
- `npm run dev:front` — front de dev (port **5173**), proxifie `/api` → `:3000`
- `npm run dev:server` — backend de dev (port **3000**, `--watch`, charge `.env` si présent)
- `npm test` — vitest (le smoke Grist est ignoré sans `GRIST_API_KEY`)
- `npm run lint` — Biome : format, tri des imports, lint (`lint:fix` applique les
  corrections sûres). Socle commun aux trois apps : `biome.base.jsonc`, à la racine
- `npm run knip` — exports, fichiers et dépendances que plus personne n'atteint
- `npm run typecheck` — `tsc -b` sur les quatre projets (front, node, serveur, tests)
- `npm run valider-regles` — compile `regles/*.publicodes` et signale les erreurs
- `npm run build` — typecheck puis build Vite (`dist/`), suivi de
  `verifier-bundle` : `pdf-lib` et le catalogue de seeds doivent rester hors du
  chunk d'entrée, sinon chaque prescripteur télécharge 1,2 Mo qu'il ne verra jamais
- `npm start` — serveur de production (`node server/server.ts`, Node 24)

Les règles d'écriture et les invariants ne sont pas de la prose : ils sont
exécutables, dans `tests/architecture.test.ts` (les frontières, les limites de 30
et 300 lignes) et `tests/lisibilite.test.ts` (la forme des fichiers, les noms, les
extensions d'import). Lis leur message d'échec : chacun dit ce que sa règle
protège. Ce qu'on en attend d'un contributeur est écrit dans
[AGENTS.md](AGENTS.md).

Depuis la racine : `mise run dev-simulateur` lance front + backend en parallèle,
`mise run verifier` passe la vérification sur les trois apps.

## Le modèle de règles

`regles/regles.publicodes` est **livré de l'extérieur et intégré par recopie** —
aujourd'hui la **v9.1** (161 règles). Le paquet du fournisseur apporte aussi un
contrat d'interface (`*.ui.yaml`, schéma 2.0.0) et une matrice de tests, tous deux
réencodés ici plutôt que chargés : le contrat d'interface se lit dans les
composants, la matrice dans `tests/simulateur/regression-v9-1.test.ts` et
`familles-v9-1.test.ts`, qui gardent les identifiants du livrable (`ALD-002`,
`SERIE-001`, `ARTICLE80-003`…) pour qu'un désaccord remonte au fournisseur sous
son nom.

Trois coutures tiennent le modèle et le code ensemble, et il faut les trois :

| Ce qui est vérifié | Par quoi |
| --- | --- |
| Le code ne nomme que des règles existantes | `contrat-regles-publicodes.ts` (TypeScript) **et** `tests/regles-front.test.ts` (les noms existent dans le modèle) |
| Le code ne compare qu'à des **valeurs** existantes | `tests/regles-front.test.ts › valeurs comparées aux sorties du moteur` — c'est la seule garde contre une reformulation en amont, que le typage ne voit pas |
| Chaque cas final est traité par les trois blocs de la Page Résultat 2 | `tests/regles-front.test.ts › exhaustivité de la Page Résultat 2` |

### Le correctif local à la v9.1

Le modèle livré déclare les **douze saisies d'adresse** (`p2_depart_*`,
`p2_arrivee_*`) sans type. Publicodes en déduit alors `booléen` — toute règle
portant `question` et rien d'autre l'est — et `@publicodes/forms` rend une case à
cocher là où le contrat d'interface 2.0.0 demande un champ texte. On ajoute donc
`type: texte` sur ces douze règles, et les trois règles qui les consommaient comme
des booléens (`p2_depart_nom_complete`, `p2_arrivee_nom_complete`,
`p2_adresses_obligatoires_completes`) testent leur présence par `est défini`.

**À rejouer à chaque livraison** tant que le fournisseur ne l'a pas intégré : une
recopie brute du YAML annule le correctif, et le symptôme est silencieux — douze
cases à cocher au lieu de douze champs.

## Configuration

Copier `.env.example` → `.env` (gitignoré). Les variables `VITE_*` sont lues au **build**
(bundlées dans le front) ; les autres sont détenues par le **serveur** (jamais exposées au
front).

| Variable | Portée | Requis | Défaut / si absente | Usage |
| --- | --- | --- | --- | --- |
| `GRIST_API_KEY` | serveur | prod | référentiel **snapshot factice** (dev/CI) | Clé API Grist source du référentiel (établissements/services/prescripteurs). Jamais exposée au front. |
| `GRIST_DOC_URL` | serveur | non | doc Grist du projet | Base API du doc Grist (`server/referentiel.ts`). |
| `PSEUDONYMISATION_SECRET` | serveur | prod | secret de dev **non sécurisé** | Secret HMAC pseudonymisant le contexte prescripteur envoyé à Matomo. **Dédié** (≠ `GRIST_API_KEY`). Générer : `openssl rand -hex 32`. |
| `PSEUDONYMISATION_EN_CLAIR` | serveur | non | HMAC (pseudonymisé) | Debug : renvoie les refs prescripteur **en clair** (préfixées) au lieu du HMAC, pour les lire dans Matomo. ⚠️ Révèle nom/prénom bruts — **jamais en production**. |
| `VITE_MATOMO_ENABLED` | front | non | `false` (traceur no-op) | Active le tracking Matomo. Actif d'office en build de prod ; à mettre à `true` pour tester en local. |
| `VITE_MATOMO_URL` | front | non | instance mutualisée beta.gouv | URL de l'instance Matomo. |
| `VITE_MATOMO_SITE_ID` | front | non | `275` | Identifiant du site Matomo. |

## Structure (feature-first)

Trois racines de *runtime* — `front/` (front, bundlé par Vite), `server/` (backend Node,
détient la clé Grist + le secret), `shared/` (contrat commun) — chacune organisée **par
feature** :

```
shared/                  contrat front ⇄ back (source unique)
  identite-pseudonymisee.ts  type IdentitePseudonymisee + VERSION + estIdentitePseudonymisee
  referentiel.ts         interface Referentiel + types + snapshot factice
  identite-saisie.ts     type IdentiteSaisie + saisieComplete
server/                  backend (barrière de sécurité : secrets ici, jamais bundlés)
  server.ts app.ts       bootstrap + composition (monte les routers, sert le front)
  identification/        LA feature backend
    routes.ts            /api/etablissements|services|prescripteurs + /api/identite-pseudonymisee
    referentiel-grist.ts  referentiel-source.ts  pseudonymisation.ts
front/                   front (bundlé par Vite)
  app/                   Main.tsx  App.tsx (écran-porte)  outil.ts
  identification/        LA feature de l'écran-porte — miroir de server/identification/
    Identification.tsx   le formulaire à révélation progressive
    referentiel-http.ts  pseudonymisation-http.ts   les deux clients de l'API
    session.ts           l'identité pseudonymisée, en mémoire de session (ADR-4)
  simulateur/            LES deux outils, sur un socle commun — la racine ne porte
                         que le socle non-visuel, tout composant est rangé
    contrat-regles-publicodes.ts  les noms de règles que le code a le droit
                         d'employer, et les types qui les imposent
    moteur.ts            moteur publicodes (règles officielles ou labo) +
                         `texte()` / `vrai()`, les deux lectures typées
    passation.ts         la couture prescripteur → secrétariat
    questionnaire/       Parcours.tsx (stepper + FormBuilder)  FormField.tsx
                         Mosaique.tsx  mosaique.ts
    resultat/            Vulgarisation.tsx (dictionnaire patient)
                         InformationPatient.tsx  TraceDebug.tsx
    prescripteur/        Prescripteur.tsx  ResultatMedical.tsx (Partie 1 → Résultat 1)
    secretariat/         Secretariat.tsx (Partie 2 → Résultat 2)
                         ResultatFinal.tsx  l'assemblage des trois blocs
                         Bloc1Resultat.tsx  Bloc2Etapes.tsx  Bloc3CasRetenu.tsx
                         Article80.tsx  la charge établissement, ses deux rendus
  outils-produit/        LA feature réservée au service produit — se greffe sur le
                         simulateur, jamais l'inverse : c'est App.tsx qui compose
                         (`panneauOutilsProduit`, `documentTelechargeable`)
    deverrouillage.ts    estServiceProduit — la garde, commune à tout ce dossier
    OutilsProduit.tsx    l'encadré partagé par l'écran-porte et le parcours
    labo/                Labo.tsx  BandeauLabo.tsx  labo.ts (test de règles par le produit)
    seeds/               catalogue des situations de référence + GalerieSeeds.tsx
    beta/                ce qui est gardé le temps d'être éprouvé, pas par nature
      cerfa/             prescription CERFA pré-remplie, générée dans le navigateur
                         depuis-simulateur.ts  la traduction situation → saisies
                         lieux-du-trajet.ts    départ et arrivée, adresses comprises
  analytics/             evenements.ts le vocabulaire mesuré, seul import du reste
                         matomo.ts     le transport (tag `_paq`, config, émission)
```
