// App Express du simulateur : **composition**. Monte la feature identification
// (référentiel + identité pseudonymisée) sous `/api`, puis sert le front (build
// Vite) en same-origin. Voir docs/architecture/identification.md — ADR-5.
//
// `createApp` prend le `Referentiel` en paramètre pour rester testable sans mock
// (les tests injectent le snapshot ; en production `server.ts` injecte le choix
// de `chooseReferentiel`).

import express, { type Express } from "express";
import type { Referentiel } from "../shared/referentiel.ts";
import { identificationRoutes } from "./identification/routes.ts";

export type AppOptions = {
  /** Secret de pseudonymisation (HMAC) de l'identité prescripteur. */
  secret: string;
  /**
   * Mode debug : renvoie les refs en clair au lieu du HMAC (lecture directe dans
   * Matomo en phase de test). ⚠️ Révèle des données brutes — jamais en production.
   */
  pseudonymesEnClair?: boolean;
  /** Répertoire du build front à servir (absent en test). */
  distDir?: string;
};

export function createApp(
  referentiel: Referentiel,
  { secret, pseudonymesEnClair = false, distDir }: AppOptions
): Express {
  const app = express();
  app.use(express.json());

  // Non-indexable : l'app est destinée à être **embarquée en iframe** dans le CMS
  // (la page canonique pour les moteurs est celle du CMS, pas l'URL brute de l'app).
  // En-tête sur **toutes** les réponses + robots.txt (double protection, indépendante
  // du build front).
  app.use((_req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send("User-agent: *\nDisallow: /\n");
  });

  app.use("/api", identificationRoutes(referentiel, secret, pseudonymesEnClair));
  // Toute autre route sous /api → 404 JSON (évite de servir index.html).
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "route inconnue" });
  });

  // Front statique + repli SPA vers index.html.
  if (distDir) {
    app.use(express.static(distDir));
    app.use((_req, res) => {
      res.sendFile("index.html", { root: distDir });
    });
  }

  return app;
}
