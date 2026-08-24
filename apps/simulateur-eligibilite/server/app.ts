// App Express du simulateur. Ce fichier ne fait que composer : il monte la feature
// identification, référentiel et identité pseudonymisée, sous `/api`, puis sert le
// front construit par Vite en same-origin. Voir l'ADR-5 de
// docs/architecture/identification.md.
//
// `creerApp` prend le `Referentiel` en paramètre pour rester testable sans mock.
// Les tests injectent le snapshot ; en production, `server.ts` injecte le choix de
// `choisirReferentiel`.

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
  dossierDist?: string;
};

export function creerApp(
  referentiel: Referentiel,
  { secret, pseudonymesEnClair = false, dossierDist }: AppOptions,
): Express {
  const app = express();
  app.use(express.json());
  interdireIndexation(app);

  app.use(
    "/api",
    identificationRoutes(referentiel, secret, pseudonymesEnClair),
  );
  // Toute autre route sous /api rend un 404 JSON, pour éviter de servir
  // index.html.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "route inconnue" });
  });

  // Front statique + repli SPA vers index.html.
  if (dossierDist) {
    app.use(express.static(dossierDist));
    app.use((_req, res) => {
      res.sendFile("index.html", { root: dossierDist });
    });
  }

  return app;
}

// ---- implémentation ----

// L'app est destinée à être embarquée en iframe dans le CMS : la page canonique
// pour les moteurs est celle du CMS, pas l'URL brute de l'app. L'en-tête est posé
// sur toutes les réponses, et doublé d'un robots.txt. Cette double protection ne
// dépend pas du build front.
function interdireIndexation(app: Express) {
  app.use((_req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });
  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send("User-agent: *\nDisallow: /\n");
  });
}
