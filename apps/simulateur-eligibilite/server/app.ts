// L'app Express. Elle monte l'API du rattachement sous `/api`, puis sert le
// front construit par Vite.
//
// `creerApp` reçoit le `Referentiel` en paramètre : les tests passent le
// snapshot, sans mock.

import express, { type Express } from "express";
import type { Referentiel } from "../shared/referentiel.ts";
import { rattachementRoutes } from "./rattachement/routes.ts";

export type AppOptions = {
  /** Répertoire du build front à servir (absent en test). */
  dossierDist?: string;
};

export function creerApp(
  referentiel: Referentiel,
  { dossierDist }: AppOptions = {},
): Express {
  const app = express();
  app.use(express.json());
  interdireIndexation(app);

  app.use("/api", rattachementRoutes(referentiel));
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
