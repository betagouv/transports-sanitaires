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
        Simu["Simulateur"]
        Analytics["Analytics"]
    end

    subgraph back["Backend (Node/Express)"]
        Ref["Référentiel"]
        Pseudo["Pseudonymisation"]
    end

    Grist[("Grist")]
    Matomo[("Matomo")]

    Ident -->|"consulte"| Ref
    Ident -->|"pseudonymise l'identité"| Pseudo
    Ident -->|"identité validée"| Simu
    Ident -->|"refs pseudonymisées"| Analytics
    Simu -->|"événements"| Analytics
    Ref -->|"lit"| Grist
    Analytics -->|"envoie"| Matomo
```

## Commandes

- `npm run dev:front` — front de dev (port **5173**), proxifie `/api` → `:3000`
- `npm run dev:server` — backend de dev (port **3000**, `--watch`, charge `.env` si présent)
- `npm test` — vitest (le smoke Grist est ignoré sans `GRIST_API_KEY`)
- `npm run build` — typecheck front + serveur, puis build Vite (`dist/`)
- `npm start` — serveur de production (`node server/server.ts`, Node 24)

Depuis la racine : `mise run dev-simulateur` lance front + backend en parallèle.

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

## Mode test des règles (labo)

Permet au **produit** de tester en autonomie une nouvelle version du fichier de règles
(`.publicodes`) sans passer par un développeur ni un déploiement. Le test est **local au
navigateur** (`localStorage`) : il n'affecte ni la production ni les autres utilisateurs.

Parcours PM :

| Étape | Action |
| --- | --- |
| 1 | S'identifier en choisissant le service **« Transport Sanitaire »** (garde d'accès, service Grist `Id2 = 4`) |
| 2 | Cliquer **« Mode test des règles »** (n'apparaît que pour ce service) |
| 3 | Déposer le fichier `.publicodes` → validation immédiate (erreurs YAML/publicodes affichées inline) |
| 4 | **« Activer et tester »** → l'app recharge et le simulateur tourne sur les nouvelles règles |
| 5 | Un **bandeau permanent** rappelle le mode test ; **« Revenir aux règles officielles »** le quitte |

Les versions chargées sont conservées en historique local (rebascule en un clic).
Implémentation : `front/labo/` (`labo.ts` état + validation, `Labo.tsx`, `BandeauLabo.tsx`) ;
le moteur consomme les règles labo au boot (`front/simulateur/engine.ts`). Les règles
**officielles** restent embarquées dans le build (`regles/*.publicodes`) — publier une
version reste un geste explicite (commit + déploiement).

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
  app/                   main.tsx  App.tsx (écran-porte)
  identification/        Identification.tsx  referentiel-http.ts
  identite/              pseudonymisation-http.ts (pseudonymiserViaApi)  session.ts
  simulateur/            Simulateur.tsx  FormField.tsx  Resultats.tsx  engine.ts
  labo/                  Labo.tsx  BandeauLabo.tsx  labo.ts (test de règles par le produit)
  analytics/             analytics.ts
  cerfa/                 prescription CERFA pré-remplie (cf. ci-dessous)
```

## Prescription pré-remplie (CERFA)

En fin de parcours secrétariat, la Page Résultat 2 propose de télécharger le CERFA
n° 11574\*07 (*Prescription médicale de transport*, réf. S3138g) **pré-rempli à partir
de la simulation**. Le bouton n'apparaît que si `cible_cas_final` vaut
`prescription médicale de transport` : un accord préalable relève du formulaire S3139,
une prise en charge par l'établissement ne donne lieu à aucun CERFA.

### Génération entièrement côté navigateur

Le formulaire réclame des données de santé nominatives (nom, NIR, date de naissance,
adresse du patient). Le simulateur n'en connaît aucune, et **les blocs d'identité
sortent volontairement vierges** — le prescripteur les complète dans son lecteur PDF,
les champs restant éditables. Générer dans le navigateur garantit qu'aucun document
nominatif ne pourra, demain, transiter par le backend ou s'échouer dans un log.

L'invariant d'identification est intact : passé l'écran-porte, l'identité du
prescripteur n'existe qu'en pseudonyme HMAC. Le bloc prescripteur du CERFA reste donc
vierge lui aussi.

`pdf-lib` (421 ko) et le gabarit (767 ko) ne sont chargés **qu'au clic**, par import
dynamique et `fetch` de l'asset : le bundle initial n'augmente que de ~3 ko.

### Le gabarit

Le CERFA officiel est un **AcroForm** de 4 pages (notice p1–p2, Volet 1 p3, Volet 2 p4)
portant **53 champs nommés**, tous inscriptibles. Il est versionné sous
`front/cerfa/gabarit/` — document public, aucune donnée personnelle.

| Propriété | Conséquence |
| --- | --- |
| 46 champs sur 53 portent un widget sur **chaque volet** | Écrire une fois remplit les deux volets ; ils ne peuvent pas diverger. |
| `comm évent` (éléments d'ordre médical) n'existe que sur le Volet 1 | La donnée médicale ne part pas à l'organisme de remboursement : le formulaire porte déjà la séparation. |
| Le bloc transporteur n'existe que sur le Volet 2 | Rempli à la main par le transporteur — on n'y écrit rien. |

### Trois pièges du gabarit

Relevés par introspection, chacun produisant un document silencieusement faux :

1. **`ALD exo`, `oui1`, `oui2` sont des radios déguisés en case à cocher.** Un même
   champ porte 4 widgets (2 par volet), d'états d'export `/OUI` et `/NON`. Le
   `check()` de `pdf-lib` retient le premier état venu et coche donc la mauvaise
   moitié une fois sur deux. `remplir-cerfa.ts` impose l'état explicitement.
2. **L'état d'export n'est pas la sémantique.** Cocher « entrée ou sortie
   d'hospitalisation » s'écrit `/NON`. Ne jamais inférer le sens du nom ou de l'état.
3. **Certains champs déclarés multilignes n'affichent qu'une ligne** (`adresse`) :
   un `\n` y rogne le reste à l'impression. Ces champs sont aplatis.

Par ailleurs, une valeur dépassant le `maxLength` d'un champ lève une erreur au lieu
d'être tronquée — un NIR tronqué sur un document opposable est pire qu'un échec.

### Ce qui est pré-rempli

| Rubrique CERFA | Source | Couverture |
| --- | --- | --- |
| ❶ Situation (hospitalisation, séances, AT/MP) | `p1_motif_*` | déduite |
| ❶ ALD **exonérante** vs non exonérante | — | non modélisé, à cocher |
| ❷ Mode de transport + justifications | `cible_transport_sanitaire_prescrit`, `p1_critere_*` | déduite |
| ❷ Véhicule personnel *vs* transports en commun | — | le simulateur fusionne les deux, le CERFA les sépare |
| Trajet : aller-retour, départ/arrivée « domicile » | `p2_trajet_*` | déduite (type de lieu seulement) |
| Trajet : adresses et noms de structures | — | à saisir |
| Urgence, accident causé par un tiers | `p2_transport_urgence`, `p2_accident_cause_par_tiers` | déduite |
| Nombre de transports itératifs | `p2_nombre_transports_prevus` | déduite **hors transport en série** — la notice réserve la rubrique à ce cas |
| Identité du patient et de l'assuré (9 champs) | — | à saisir (cf. ci-dessus) |
| Identité du prescripteur (6 champs) | — | à saisir (cf. ci-dessus) |
| Éléments d'ordre médical, ticket modérateur, pension militaire | — | rédaction / décision du prescripteur |

`saisiesDepuisSituation` ne rend **que** ce que les règles justifient : aucune valeur
inventée, aucun défaut arbitraire.

### Modules

```
front/cerfa/
  BoutonCerfa.tsx      action de fin de parcours (état, erreur, libellés)
  cerfa.ts             orchestration : chargement du gabarit, génération, téléchargement
  depuis-simulateur.ts situation publicodes → saisies CERFA (+ RESTE_A_SAISIR)
  remplir-cerfa.ts     écriture pdf-lib (aucun import node:* — doit rester front)
  champs-cerfa.ts      inventaire typé des 53 champs et de leurs pièges
  gabarit/             CERFA officiel, servi en asset
```

Un échec de génération affiche une alerte sans masquer le résultat déjà affiché : le
parcours reste exploitable sans le PDF.

### Y accéder rapidement (dev)

En dev (`npm run dev:front`), la première page du parcours prescripteur affiche, dans
l'encadré **« Raccourcis de développement »**, le bouton **« Secrétariat — prescription
(CERFA) »** : le questionnaire est court-circuité et la Page Résultat 2 s'ouvre sur la
variante `secretariat-prescription` de `raccourcis-dev.ts` (ALD + position allongée
⇒ ambulance), seule dont le cas final propose le CERFA.

L'écran d'identification porte le même encadré, avec les quatre raccourcis. Chaque
libellé nomme **d'abord l'écran d'atterrissage, puis ce qu'on y voit** — c'est l'écran
qui les distingue vraiment, l'issue seule donnant des libellés jumeaux :

| Bouton | Variante | Ce qu'on obtient |
| --- | --- | --- |
| Prescripteur — ambulance justifiée | `prescripteur-ambulance` | Page Résultat 1, résultat médical favorable |
| Prescripteur — transport non justifié | `prescripteur-non-justifie` | Page Résultat 1, aucun transport justifié |
| Secrétariat — prescription (CERFA) | `secretariat-prescription` | Page Résultat 2, prescription médicale de transport |
| Secrétariat — non éligible | `secretariat-non-eligible` | Page Résultat 2, non éligible assurance maladie |

Cet encadré (`front/app/RaccourcisDev.tsx`) isole visuellement tout ce qui
court-circuite le parcours, pour qu'aucun de ces boutons ne se confonde avec une
action nominale — « Mode test des règles » (labo) reste, lui, une vraie fonctionnalité
produit et donc hors de l'encadré.

Le bouton est câblé **uniquement** sous `import.meta.env.DEV` : en production le
parcours ne peut pas être sauté, une prescription ne devant jamais reposer sur une
situation fabriquée.

### Commandes

```
npx vitest run tests/cerfa    # 24 tests : gabarit, remplissage, mapping, UI, raccourci dev
npm run apercu-cerfa          # écrit apercu-cerfa.pdf depuis une situation d'exemple
```

La situation d'exemple d'`apercu-cerfa` est volontairement chargée — deux motifs
ouvrant droit, les cinq justifications d'ambulance, aller-retour depuis le domicile,
urgence SAMU, accident causé par un tiers, transport répété — pour voir d'un coup
d'œil **12 champs déduits** et, par contraste, tout ce qui reste vierge.
