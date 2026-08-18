# AGENTS.md

> Instructions for AI agents.

## Communication

### ALWAYS

- Be concise
- Ask questions regarding product, architecture, code

### NEVER

- Praise
- Assume done

## Repository

Light monorepo — **no workspace tooling** (no npm/pnpm workspaces, no turbo). Each
app under `apps/` is **independent**: its own `package.json` + `package-lock.json`,
its own CI `working-directory`. Toolchain via `mise` (Node 24, Python 3.13).

- **`apps/simulateur-eligibilite`** — React 19 + Vite + DSFR
  (`@codegouvfr/react-dsfr`). Eligibility rules engine **`publicodes`** (single file
  `regles/regles.publicodes`) + `@publicodes/forms` (`FormBuilder` auto-generates the
  form from the rules). Fronted by a **mandatory prescriber-identification gate**
  (`front/identification/`, referential from Grist). Served by a **Node/Express backend**
  (`server/`, front + `/api/*`), deployed to **Scalingo** — not static. **Feature-first
  layout** across three runtime roots: `front/` (browser, bundled by Vite), `server/`
  (backend, holds secrets), `shared/` (front⇄back contract). See
  `docs/architecture/identification.md`. End of journey: `outils-produit/beta/cerfa/`
  fills the official CERFA (AcroForm, `pdf-lib`) **in the browser only** — the form
  carries nominative health data, so no filled document must ever reach the backend.
  It sits under `beta/` because its download button is gated on the *outils produit*
  access (below) until the pre-filling is proven, not because of its nature.
  Reference situations live in **`front/outils-produit/seeds/`**: one catalogue of named
  situations **with their expected targets** (plain `publicodes`, readable by Node too),
  replayed by the business non-regression matrix, browsable through the **seed gallery**
  (same folder, dynamic import) and used by `npm run apercu-cerfa`.
  Add a reference situation there, not in a test file. The gallery and the rules **lab**
  are the two *outils produit*: same access gate on **every environment** (referential
  service n° 4, `front/outils-produit/acces.ts`), same panel, both
  entered **after** identification — no `import.meta.env.DEV` gating.
- **`apps/glossaire-notion`** — browser extension (React + `notion-client`), packaged
  with `npm run zip`.

## Commands (run inside the app directory)

- `npm test` — vitest (run mode)
- `npm run build` — `tsc -b && vite build` (simulateur ; `tsc -b` typecheck front + serveur via les 3 projets référencés)
- `npm run dev:front` — vite dev server (front); `npm run dev:server` — Express backend
- `npm start` — production server (`node server/server.ts`, Node 24)

## Conventions

- **French** everywhere: UI, rule names, tests, docs, product.
- **Tests without mocks.** Engine tests drive the real `publicodes` engine; UI tests
  use Testing Library against the real `<App />`. Reuse the existing helpers in
  `tests/`.
- **DSFR** for all UI.
- **publicodes**: rule keys use ` . ` separators; `une possibilité` values are quoted
  (`"'valeur'"`); booleans are `oui`/`non`. Pass situations to the engine with the
  exact rule keys — unknown keys throw.
- **`@publicodes/forms` + StrictMode gotcha**: `goToNextPage` / `handleInputChange`
  mutate their argument. Do **not** use the `setState(prev => …)` callback form with
  them; pass the current `formState` directly (tests render without StrictMode so they
  won't catch this).

## Git

- **Always work on `main`.** Commit directly to `main` — do **not** create feature
  branches (no PR workflow).

## Invariants

- Keep **identification and analytics out of the publicodes engine**.
  `regles.publicodes` holds eligibility logic only.

## Architecture

- Design docs (ADR + spec, kept at **C4 Component level** — no code-file detail) live
  in **`docs/architecture/`**: `identification.md`, `analytics.md`.
- For non-trivial or model-changing tasks, **frame/plan the architecture before
  coding**; present options + a recommendation, not a single path.
