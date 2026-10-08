import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { parse } from "yaml";

export default defineConfig({
  base: "./",
  plugins: [react(), reglesPublicodes()],
  // Ce que le pied de page affiche pour qu'un utilisateur puisse dire *quelle*
  // application il regarde : la version livrée et le commit déployé. Figés à
  // la construction : le navigateur n'a aucun moyen de les découvrir.
  define: {
    "import.meta.env.VITE_VERSION_APP": JSON.stringify(versionDeLApp()),
    "import.meta.env.VITE_SHA_COMMIT": JSON.stringify(shaDuCommit()),
  },
  // En dev, l'API (référentiel + contexte) est servie par le backend Express
  // (port 3000) ; Vite proxifie `/api` pour reproduire le same-origin de la prod.
  server: {
    proxy: { "/api": "http://localhost:3000" },
  },
  test: {
    environment: "happy-dom",
    setupFiles: ["./tests/setup.ts"],
  },
});

// Les règles du modèle sont livrées en YAML (`front/model/rules/*.publicodes`).
// Elles sont converties en objet ici, à la compilation : le navigateur reçoit
// du JavaScript, et aucun analyseur YAML ne part dans le bundle. Vitest passe
// par la même conversion.
function reglesPublicodes(): Plugin {
  return {
    name: "regles-publicodes",
    transform(yaml, id) {
      if (!id.endsWith(".publicodes")) return null;
      return {
        code: `export const rules = ${JSON.stringify(parse(yaml))};`,
        map: null,
      };
    },
  };
}

// La version livrée est celle que `package.json` déclare : c'est elle que porte
// le tag `simulateur-eligibilite@<version>`, donc la release vers laquelle le
// pied de page renvoie. Aucun repli — une version fausse vaudrait moins qu'un
// build qui s'arrête, et `package.json` est là par construction.
function versionDeLApp(): string {
  const { version } = JSON.parse(readFileSync("package.json", "utf8")) as {
    version: string;
  };
  return version;
}

// Scalingo pose `SOURCE_VERSION` à la construction, et c'est la seule source
// fiable en production : le dépôt n'y est pas forcément présent. En local et en
// CI, `git` répond ; ailleurs, on préfère l'avouer plutôt qu'afficher un faux.
function shaDuCommit(): string {
  const fourni = process.env.SOURCE_VERSION;
  if (fourni) return fourni.slice(0, 7);
  try {
    return execSync("git rev-parse --short=7 HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "inconnu";
  }
}
