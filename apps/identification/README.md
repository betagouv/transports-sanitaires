# App d'identification

SPA statique (React 19 + Vite + DSFR) qui identifie le prescripteur **en amont** du
[simulateur d'éligibilité](../simulateur-eligibilite), puis y redirige avec un contexte
d'identifiants opaques.

Architecture de référence : [`docs/architecture/identification.md`](../../docs/architecture/identification.md).

## Périmètre (incrément 1)

- Parcours en 2 étapes : établissement → service, puis prescripteur (ou « autre »).
- **Référentiel factice** (`src/referentiel.ts`), 100 % statique, derrière l'interface
  `Referentiel` — à substituer ultérieurement par la micro-fonction Grist (incrément 2).
- À la validation : construit le contexte `{ etabId, serviceId, prescripteurId, v }`
  (identifiants **opaques**, aucune PII, aucune donnée patient), l'encode en base64url
  et **navigue en top-level** vers le simulateur : `…/simulateur#ctx=<payload>`.

## Commandes

- `npm run dev` — serveur de dev (port **5174**)
- `npm test` — vitest
- `npm run build` — `tsc -b && vite build`

## Configuration — URL du simulateur

URL de base vers laquelle rediriger après identification, résolue par ordre de
priorité (voir `src/config.ts`) :

1. **Runtime** — balise `<meta name="simulateur-url" content="…">` dans
   `index.html`. Modifiable **directement sur l'artefact déployé, sans rebuild**
   (adapté à l'embarquement iframe multi-environnements). Laisser `content=""` pour
   l'ignorer.
2. **Build** — variable d'environnement `VITE_SIMULATEUR_URL` (cf. `.env.example`),
   figée à la compilation.
3. **Défaut** — `http://localhost:5173` (dev).
