import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
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
