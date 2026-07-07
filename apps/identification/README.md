# App d'identification

Identifie le prescripteur **en amont** du
[simulateur d'éligibilité](../simulateur-eligibilite), puis y redirige avec un contexte
d'identifiants opaques. **App unique** : un front React (Vite + DSFR) servi par un
**backend Node/Express** qui expose aussi l'API du référentiel (Grist).

Architecture de référence : [`docs/architecture/identification.md`](../../docs/architecture/identification.md)
(ADR-5).

## Fonctionnement

- Parcours en 2 étapes : établissement → service, puis prescripteur (ou « autre »).
- Le **front** (`src/`) consomme le référentiel via l'API **same-origin** `/api/*`
  (`src/http-referentiel.ts`), derrière l'interface `Referentiel` (`src/referentiel.ts`).
- Le **backend** (`server/`) sert le build front **et** l'API :
  - `GET /api/etablissements`
  - `GET /api/services?etabId=…`
  - `GET /api/prescripteurs?serviceId=…`
  - Source : **Grist** (`server/grist.ts`) si `GRIST_API_KEY` est présente ; sinon le
    **snapshot factice** partagé (`src/referentiel.ts`) — dev/CI sans secret.
    La clé Grist et les noms de prescripteurs (PII) restent **côté serveur** ; les
    prescripteurs ne sont renvoyés que pour le service demandé.
- À la validation : contexte `{ etabId, serviceId, prescripteurId, v }` (identifiants
  **opaques** = colonne `Id` Grist, aucune PII, aucune donnée patient), encodé base64url,
  **navigation top-level** vers `…/simulateur#ctx=<payload>`.

## Commandes

- `npm run dev` — front de dev (port **5174**), proxifie `/api` → `:3000`
- `npm run dev:server` — backend de dev (port **3000**, `--watch`, charge `.env` si présent)
- `npm test` — vitest (le smoke Grist est ignoré sans `GRIST_API_KEY`)
- `npm run build` — typecheck front + serveur, puis build Vite (`dist/`)
- `npm start` — serveur de production (`node server/server.ts`, Node 24)

Depuis la racine du repo : `mise run dev-identification` lance front + backend en
parallèle.

## Configuration

Copier `.env.example` → `.env` (gitignoré). Variables :

- `VITE_SIMULATEUR_URL` *(build)* — URL du simulateur pour la redirection. Surchargeable
  à l'exécution par `<meta name="simulateur-url">` dans `index.html` (voir `src/config.ts`).
- `GRIST_API_KEY` *(serveur)* — clé API Grist. **Absente ⇒ référentiel snapshot factice.**
- `GRIST_DOC_URL` *(serveur, optionnel)* — base API du doc Grist ; défaut = doc du projet
  (`server/referentiel.ts`).

## Déploiement (Scalingo)

App Node (front + backend, cf. ADR-5). Scalingo lance `npm run build` puis `npm start`
(`Procfile`). Définir en variables d'environnement Scalingo : `GRIST_API_KEY`,
éventuellement `VITE_SIMULATEUR_URL` / `GRIST_DOC_URL`. `PORT` est fourni par Scalingo.
Le serveur exécute le TypeScript directement (type stripping natif de Node 24, épinglé
via `engines`).
