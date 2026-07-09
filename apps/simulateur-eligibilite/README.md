# Simulateur d'éligibilité aux transports sanitaires

Simulateur d'éligibilité (React 19 + Vite + DSFR, moteur `publicodes`) précédé d'une
**étape d'identification du prescripteur obligatoire** : on ne peut pas simuler sans
s'être identifié. **App unique** — un front React servi par un **backend Node/Express**
qui expose aussi l'API du référentiel (Grist) et du contexte pseudonymisé.

Architecture de référence : [`docs/architecture/identification.md`](../../docs/architecture/identification.md)
et [`docs/architecture/analytics.md`](../../docs/architecture/analytics.md).

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
  analytics/             analytics.ts
```

## Fonctionnement

- **Écran-porte** (`front/app/App.tsx`) : affiche l'identification
  (`front/identification/Identification.tsx`, formulaire à **branches** — établissement
  → service → prescripteur, avec les cas « non rattaché », service « autre » et
  prescripteur hors liste → nom/prénom libres ; cf. ADR-4 §4) ; une fois validée,
  bascule sur le simulateur (`front/simulateur/Simulateur.tsx`), inchangé.
- Le **front** consomme le référentiel via l'API **same-origin** `/api/*`
  (`front/identification/referentiel-http.ts`), derrière l'interface `Referentiel`
  (`shared/referentiel.ts`).
- Le **backend** sert le build front **et** l'API (feature `identification`,
  `server/identification/routes.ts`) :
  - `GET /api/etablissements`, `GET /api/services?etabId=…`,
    `GET /api/prescripteurs?serviceId=…`
  - `POST /api/identite-pseudonymisee` — reçoit l'identité saisie brute, renvoie les **refs
    pseudonymisées** `{ etabRef, serviceRef, prescripteurRef, v: 2 }` (chaque ref =
    `HMAC-SHA256(id, secret)`, `server/identification/pseudonymisation.ts`) — **jamais
    d'identifiant brut ni de nom**, secret côté serveur uniquement.
  - Source du référentiel : **Grist** (`server/identification/referentiel-grist.ts`) si
    `GRIST_API_KEY` est présente ; sinon le **snapshot factice** (`shared/referentiel.ts`)
    — dev/CI sans secret.
- Le front garde les refs en **mémoire de session** (`front/contexte/session.ts`) et les
  forwarde à **Matomo** (`front/analytics/analytics.ts`, cookieless — l'app tourne dans
  l'iframe du CMS).

## Commandes

- `npm run dev:front` — front de dev (port **5173**), proxifie `/api` → `:3000`
- `npm run dev:server` — backend de dev (port **3000**, `--watch`, charge `.env` si présent)
- `npm test` — vitest (le smoke Grist est ignoré sans `GRIST_API_KEY`)
- `npm run build` — typecheck front + serveur, puis build Vite (`dist/`)
- `npm start` — serveur de production (`node server/server.ts`, Node 24)

Depuis la racine : `mise run dev-simulateur` lance front + backend en parallèle.

## Configuration

Copier `.env.example` → `.env` (gitignoré). Variables :

- `GRIST_API_KEY` *(serveur)* — clé API Grist. **Absente ⇒ référentiel snapshot factice.**
- `GRIST_DOC_URL` *(serveur, optionnel)* — base API du doc Grist ; défaut = doc du projet.
- `PSEUDONYMISATION_SECRET` *(serveur)* — secret HMAC du contexte prescripteur.
- `VITE_MATOMO_ENABLED` / `VITE_MATOMO_URL` / `VITE_MATOMO_SITE_ID` *(build)* — voir
  `docs/architecture/analytics.md`.

## Déploiement (Scalingo)

App Node (front + backend, cf. ADR-5). Scalingo lance `npm run build` puis `npm start`
(`Procfile`). Définir en variables d'environnement Scalingo : `GRIST_API_KEY`,
`PSEUDONYMISATION_SECRET`, éventuellement `GRIST_DOC_URL`. `PORT` est fourni par
Scalingo. Le serveur exécute le TypeScript directement (type stripping natif de Node 24,
épinglé via `engines`). Configurer l'app Scalingo pour cibler le sous-dossier
`apps/simulateur-eligibilite` (monorepo).
