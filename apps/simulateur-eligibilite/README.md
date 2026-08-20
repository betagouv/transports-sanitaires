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
aujourd'hui la **v9.2.1** (172 règles). Le fichier livré ne porte pas sa version :
`regles/VERSION` la porte à côté de lui, et c'est elle que le pied de page
affiche. **Une recopie met les deux à jour**, sans quoi l'application annonce une
version qu'elle n'exécute pas. Le paquet du fournisseur apporte aussi un
contrat d'interface (`*.ui.yaml`, schéma 2.0.0) et une matrice de tests, tous deux
réencodés ici plutôt que chargés : le contrat d'interface se lit dans les
composants, la matrice dans `tests/simulateur/regression-v9-2-1.test.ts` et
`familles-v9-2-1.test.ts`, qui gardent les identifiants du livrable (`ALD-002`,
`SERIE-001`, `ARTICLE80-003`…) pour qu'un désaccord remonte au fournisseur sous
son nom.

Trois coutures tiennent le modèle et le code ensemble, et il faut les trois :

| Ce qui est vérifié | Par quoi |
| --- | --- |
| Le code ne nomme que des règles existantes | `contrat-regles-publicodes.ts` (TypeScript) **et** `tests/regles-front.test.ts` (les noms existent dans le modèle) |
| Le code ne compare qu'à des **valeurs** existantes | `tests/regles-front.test.ts › valeurs comparées aux sorties du moteur` — c'est la seule garde contre une reformulation en amont, que le typage ne voit pas |
| Chaque cas final est traité par les trois blocs de la Page Résultat 2 | `tests/regles-front.test.ts › exhaustivité de la Page Résultat 2` |

### Deux comportements que le modèle ne porte pas

Le contrat d'interface 2.0.0 décrit deux règles que le moteur ne peut pas
appliquer seul — il calcule les cibles, il ne pilote ni les écrans ni ce qui
reste modifiable :

- **L'avancement automatique.** Une page qui n'est faite que de choix uniques
  avance seule 200 ms après avoir été répondue, sans bouton « Suivant ». Au
  **retour** sur une page déjà répondue, elle rend la main au bouton — faute de
  quoi « Précédent » renverrait aussitôt d'où l'on vient — et modifier la
  réponse relance l'avancement. Tout est dans
  `questionnaire/avancement-automatique.ts`.
- **Le verrouillage de la décision médicale.** Elle n'est *pas* figée à
  l'ouverture du Résultat 1 : « Précédent » y rouvre le questionnaire sur sa
  dernière page, réponses intactes. C'est l'action principale qui verrouille, et
  elle est irréversible — la Partie 2 ne repose aucune question de Partie 1 et
  son « Précédent » ne descend jamais sous sa première page. Seule une nouvelle
  simulation remet tout à zéro.

### Les adresses obligatoires, et le correctif qui n'est plus local

La v9.1 laissait les **douze saisies d'adresse** (`p2_depart_*`, `p2_arrivee_*`)
sans type — Publicodes en déduisait `booléen`, et `@publicodes/forms` rendait
douze cases à cocher là où le contrat d'interface 2.0.0 demande des champs texte.
Plus discret : trois règles les lisaient comme des booléens. Publicodes ne lève
pas, il rend la dernière valeur de la conjonction, si bien que
`p2_adresses_obligatoires_completes` cessait d'être un booléen et que
`cible_resultat_2_affichable` ne valait plus jamais `false` — alors que le contrat
la garde par `block_when_false`.

Les deux morceaux ont vécu ici en correctif local, le temps d'une demande au
fournisseur. **La v9.2.1 les intègre en amont** : `type: texte` sur les douze
règles, et huit règles `_renseigne(e)` qui testent qu'un champ obligatoire est
**défini** *et* **non vide** — `est défini` attrape la question jamais répondue,
`!= ''` la saisie effacée. Le modèle est donc recopié tel quel, sans retouche.

Ce qui reste, c'est la garde :
[`tests/simulateur/adresses-obligatoires.test.ts`](tests/simulateur/adresses-obligatoires.test.ts).
Le symptôme du premier morceau se voit à l'œil nu ; celui du second, non — une
livraison qui referait le défaut ferait échouer ce fichier plutôt qu'un écran en
production.

### Les pages d'adresse, seule exception à « une question par écran »

Une adresse est **une** information : le livrable la veut d'un seul tenant, pas
sur six écrans. Le parcours pose donc le lieu de départ sur une page et le lieu
d'arrivée sur la suivante. Deux mécaniques s'y opposaient, et il a fallu les deux
pour y arriver — [`secretariat/Secretariat.tsx`](front/simulateur/secretariat/Secretariat.tsx)
et [`questionnaire/pagination.ts`](front/simulateur/questionnaire/pagination.ts) :

| Ce qui bloquait | Ce qui le lève |
|---|---|
| `p2_adresses_obligatoires_completes` est une conjonction, et publicodes n'évalue pas ce qui suit sa première condition non satisfaite : **une seule adresse manquait à la fois** | le secrétariat cible les douze sorties `cible_document_*`, qui ne sont que des `valeur:` — les douze questions manquent alors ensemble |
| le complément et le pays ne sont dans le graphe d'aucune cible : ils n'étaient **jamais posés**, alors que le CERFA les lit | les mêmes douze cibles |
| `groupByNamespace` (pagination par défaut) regroupe sur le premier segment d'un nom **pointé**, or le modèle est plat : une question, une page | un `pageBuilder` qui réunit les saisies d'un même lieu, et place ces pages **en dernier** — sinon le nom du lieu de départ, applicable un cran plus tôt, partirait devant |
| une question posée doit être répondue pour quitter la page — poser le pays reviendrait à l'exiger | `facultatives`, la liste que le secrétariat passe au parcours : posées, non bloquantes |

[`tests/simulateur/adresses-du-trajet.test.tsx`](tests/simulateur/adresses-du-trajet.test.tsx)
tient l'ensemble, du point de vue de l'utilisateur : six champs par lieu, dans
l'ordre du formulaire papier, le départ puis l'arrivée — cinq seulement pour un
trajet qui part du domicile, le nom du lieu n'y étant pas applicable.

Pour voir l'écran sans traverser la Partie 2, la galerie porte la seed
`secretariat-saisie-adresses` : elle répond à tout **sauf** aux adresses, et ouvre
donc le questionnaire là-dessus. C'est la première seed d'une nature nouvelle —
`atterrissage: "questionnaire"` —, qui ne décide aucune cible et n'est donc pas un
cas de non-régression, mais un raccourci vers un écran. `scenarios.test.ts` la
range à part et vérifie qu'elle s'arrête bel et bien en chemin.

## Savoir ce qui tourne

Un pied de page discret accompagne le simulateur : `Version 1a2b3c4 · règles v9.2.1`.
C'est un outil de support — quand un prescripteur signale un résultat surprenant,
ces deux valeurs disent quel code et quel modèle il avait sous les yeux.

| Valeur | D'où elle vient |
| --- | --- |
| Le sha du commit | `SOURCE_VERSION`, posée par Scalingo à la construction ; à défaut `git rev-parse`, en local et en CI ; à défaut `inconnu` — jamais une valeur inventée |
| La version des règles | `regles/VERSION`, lue à la construction |

Les deux sont figées par Vite (`define`, cf. `vite.config.ts`) : le navigateur n'a
aucun moyen de les découvrir. `tests/app/BandeauVersion.test.tsx` vérifie que ce
qui est affiché est bien ce que `regles/VERSION` déclare — une recopie qui
oublierait de la mettre à jour afficherait sinon un mensonge à tous les
utilisateurs.

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
    questionnaire/       Parcours.tsx (stepper + FormBuilder)
                         ChampDeFormulaire.tsx  ChampsDePage.tsx
                         Mosaique.tsx  mosaique.ts
                         passation.ts  l'état du parcours et ses gestes
                         avancement-automatique.ts  les 200 ms du contrat 2.0.0
                         pagination.ts  une question par page, sauf les adresses
                         (un lieu par page)
                         suivi-de-parcours.ts  ce qui part vers l'analytics
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
    seeds/               catalogue des situations de référence, base-neutre.ts
                         GalerieSeeds.tsx  les écrans d'atterrissage
                         TableauDesSeeds.tsx  comment une seed se lit en tableau
    beta/                ce qui est gardé le temps d'être éprouvé, pas par nature
      cerfa/             prescription CERFA pré-remplie, générée dans le navigateur
                         depuis-simulateur.ts  la traduction situation → saisies
                         lieux-du-trajet.ts    départ et arrivée, adresses comprises
  analytics/             evenements.ts le vocabulaire mesuré, seul import du reste
                         matomo.ts     le transport (tag `_paq`, config, émission)
```
