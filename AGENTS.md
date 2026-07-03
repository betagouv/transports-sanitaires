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

- **`apps/simulateur-eligibilite`** — SPA React 19 + Vite + DSFR
  (`@codegouvfr/react-dsfr`). Eligibility rules engine **`publicodes`** (single file
  `regles/regles.publicodes`) + `@publicodes/forms` (`FormBuilder` auto-generates the
  form from the rules). **Static**, deployed to GitHub Pages
  (`.github/workflows/deploy.yml`).
- **`apps/glossaire-notion`** — browser extension (React + `notion-client`), packaged
  with `npm run zip`.

## Commands (run inside the app directory)

- `npm test` — vitest (run mode)
- `npm run build` — `tsc -b && vite build`
- `npm run dev` — vite dev server (simulateur)

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

## Invariants

- Keep **identification and analytics out of the publicodes engine**.
  `regles.publicodes` holds eligibility logic only.

## Architecture

- Design docs (ADR + spec, kept at **C4 Component level** — no code-file detail) live
  in **`docs/architecture/`**: `identification.md`, `analytics.md`.
- For non-trivial or model-changing tasks, **frame/plan the architecture before
  coding**; present options + a recommendation, not a single path.
