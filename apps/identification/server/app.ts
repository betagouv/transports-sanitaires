// App Express de l'identification : sert le front (build Vite) **et** expose
// l'API référentiel same-origin. Voir docs/architecture/identification.md — ADR-5.
//
// `createApp` prend le `Referentiel` en paramètre pour rester testable sans mock
// (les tests injectent le snapshot ; en production `server.ts` injecte le choix
// de `chooseReferentiel`).

import express, { type Express, type Request, type Response } from "express";
import type { Referentiel } from "../src/referentiel.ts";

// Enrobe un handler async pour router les rejets vers le middleware d'erreur.
function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err: unknown) => {
      console.error("[identification] erreur référentiel:", err);
      res.status(502).json({ error: "referentiel indisponible" });
    });
  };
}

export function createApp(referentiel: Referentiel, distDir?: string): Express {
  const app = express();

  app.get(
    "/api/etablissements",
    handle(async (_req, res) => {
      res.json(await referentiel.getEtablissements());
    })
  );

  app.get(
    "/api/services",
    handle(async (req, res) => {
      const etabId = String(req.query.etabId ?? "");
      if (!etabId) {
        res.status(400).json({ error: "etabId requis" });
        return;
      }
      res.json(await referentiel.getServices(etabId));
    })
  );

  app.get(
    "/api/prescripteurs",
    handle(async (req, res) => {
      const serviceId = String(req.query.serviceId ?? "");
      if (!serviceId) {
        res.status(400).json({ error: "serviceId requis" });
        return;
      }
      res.json(await referentiel.getPrescripteurs(serviceId));
    })
  );

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
