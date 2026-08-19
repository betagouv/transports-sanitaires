# AGENTS.md — glossaire-notion

> Les conventions du dépôt sont dans [`../../AGENTS.md`](../../AGENTS.md). Ici,
> ce qui est propre à cette app.

Extension de navigateur (React + `notion-client`) qui affiche le glossaire tenu
dans Notion : une popup, un champ de recherche, un cache local.

- **Popup uniquement** — pas de script de contenu, pas de service worker. Le
  point d'entrée du navigateur est `src/popup/main.tsx`.
- **Accès Notion sans jeton** : `notion-client` lit la page publiée. Les
  `host_permissions` du `manifest.json` accordent l'accès cross-origin, d'où le
  `mode: "cors"` forcé dans `src/notion.ts` (le défaut `no-cors` de la
  bibliothèque casse l'en-tête `Content-Type` dans un vrai navigateur).
- `npm run verifier` — lint, typecheck, knip, tests, build.
- `npm run zip` engendre l'archive à charger dans le navigateur. **La version se
  tient à la main** dans `package.json` : c'est elle qui nomme l'archive.

**Cette app est en anglais**, en-têtes et identifiants compris — dérogation
assumée à la règle du dépôt (voir `../../AGENTS.md § Français`). Elle n'a pas de
vocabulaire métier propre. **N'y mélange pas les deux langues** : du code neuf
ici s'écrit en anglais, comme ce qui l'entoure.
