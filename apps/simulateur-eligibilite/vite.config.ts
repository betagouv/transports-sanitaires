import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  plugins: [react()],
  // Ce que le pied de page affiche pour qu'un utilisateur puisse dire *quelle*
  // application il regarde : le commit déployé et la version du modèle de règles.
  // Figés à la construction — le navigateur n'a aucun moyen de les découvrir.
  define: {
    "import.meta.env.VITE_SHA_COMMIT": JSON.stringify(shaDuCommit()),
    "import.meta.env.VITE_VERSION_REGLES": JSON.stringify(versionDesRegles()),
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

// Le modèle est livré de l'extérieur et recopié sous un nom fixe : il ne porte
// donc pas sa version. `regles/VERSION` la porte à côté de lui, et se met à jour
// avec lui (cf. README, « Le modèle de règles »).
function versionDesRegles(): string {
  try {
    return readFileSync("regles/VERSION", "utf8").trim() || "inconnue";
  } catch {
    return "inconnue";
  }
}
