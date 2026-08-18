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

- `npm run verifier` — **the one to run before saying you are done**: lint, typecheck,
  rules validation, tests. Same gates as CI, same order.
- `npm run lint` — Biome (format + lint + import sort); `npm run lint:fix` applies
  every safe fix. A `PostToolUse` hook already runs this on each `.ts`/`.tsx` you
  write, so formatting is never yours to argue about.
- `npm run typecheck` — `tsc -b` over the **four** projects: front, node (scripts +
  vite config), server, tests.
- `npm test` — vitest (run mode)
- `npm run build` — `tsc -b && vite build`, then `verifier-bundle`: `pdf-lib` and
  the seed catalogue must stay out of the entry chunk. If you replace an
  `import()` with a static import, this is what tells you.
- `npm run dev:front` — vite dev server (front); `npm run dev:server` — Express backend
- `npm start` — production server (`node server/server.ts`, Node 24)

## Conventions

- **French** everywhere: UI, rule names, tests, docs, product — **and identifiers**.
  English is reserved for what an external API already names that way: `handleX` /
  `useX` / `Props` (React), `track*` (Matomo's verb), `new FormBuilder({ engine })`
  (`@publicodes/forms` key), `Engine` (publicodes class). Everything else is domain
  vocabulary and reads in French: `moteur`, `regles`, `passation`, `identiteEnSession`.
- **Style is not a discussion.** Biome owns formatting, import order and lint. Never
  hand-format, and never write a suppression comment for a linter the project does
  not run — a stray `eslint-disable` sat in `Parcours.tsx` for months, suppressing
  nothing. Suppress with `// biome-ignore <rule>: <reason>` on the line **immediately**
  before the offending line, with the reason spelled out above it.
- **Import extensions follow the runtime, not taste**: files under `front/` are bundled
  by Vite and import **without** an extension; files under `server/` and `shared/` are
  executed by Node directly and import **with** `.ts`. Tests follow whichever side they
  import from.
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

These are **executable**, in `tests/architecture.test.ts` — do not restate them here
without adding the matching assertion there, and read that file's failure messages
before working around one:

- `front/` imports nothing from `server/` (the secrets live there), and vice versa.
- `shared/` depends on neither — it is loaded by both.
- `front/simulateur/` never imports `front/identification/`: the eligibility engine
  reasons on a medical situation, never on who prescribes.
- `front/outils-produit/beta/cerfa/` never references an `/api` route: the prescriber
  fills nominative health data there, and it must not leave the browser.
- `regles.publicodes` holds eligibility logic only — no identification, no analytics.
- `front/simulateur/` never imports `front/outils-produit/`: the product tools are
  built **on** the simulator, and `App.tsx` hands the simulator ready-made content
  (`panneauOutilsProduit`, `documentTelechargeable`). One named exception —
  `moteur.ts` asking `labo/labo.ts` which rules to load — is asserted explicitly so
  it cannot quietly grow a second.

## Architecture

- Design docs (ADR + spec, kept at **C4 Component level** — no code-file detail) live
  in **`docs/architecture/`**: `identification.md`, `analytics.md`.
- For non-trivial or model-changing tasks, **frame/plan the architecture before
  coding**; present options + a recommendation, not a single path.
