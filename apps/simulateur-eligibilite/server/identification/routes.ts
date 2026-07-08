// Router de la feature **identification** (backend) : lecture du référentiel
// (établissement / service / prescripteur) + construction du contexte
// pseudonymisé. Monté sous `/api` par `server/app.ts`. Voir
// docs/architecture/identification.md — ADR-5.
//
// Prend le `Referentiel` et le secret en paramètres pour rester testable sans
// mock (les tests injectent le snapshot).

import express, { type Router, type Request, type Response } from "express";
import type { Referentiel } from "../../shared/referentiel.ts";
import type { Selection } from "../../shared/selection.ts";
import { buildContexte } from "./pseudonymisation.ts";

// Enrobe un handler async pour router les rejets vers une réponse d'erreur.
function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    fn(req, res).catch((err: unknown) => {
      console.error("[simulateur] erreur référentiel:", err);
      res.status(502).json({ error: "referentiel indisponible" });
    });
  };
}

export function identificationRoutes(
  referentiel: Referentiel,
  secret: string
): Router {
  const router = express.Router();

  router.get(
    "/etablissements",
    handle(async (_req, res) => {
      res.json(await referentiel.getEtablissements());
    })
  );

  router.get(
    "/services",
    handle(async (req, res) => {
      const etabId = String(req.query.etabId ?? "");
      if (!etabId) {
        res.status(400).json({ error: "etabId requis" });
        return;
      }
      res.json(await referentiel.getServices(etabId));
    })
  );

  router.get(
    "/prescripteurs",
    handle(async (req, res) => {
      const serviceId = String(req.query.serviceId ?? "");
      if (!serviceId) {
        res.status(400).json({ error: "serviceId requis" });
        return;
      }
      res.json(await referentiel.getPrescripteurs(serviceId));
    })
  );

  // Construit le contexte pseudonymisé de la sélection (refs HMAC). Reçoit la
  // sélection brute, renvoie l'objet refs en JSON — le secret HMAC ne quitte
  // jamais le serveur. Le front garde ces refs en mémoire pour Matomo.
  router.post(
    "/contexte",
    handle(async (req, res) => {
      const { etabId, serviceId, prescripteurId } = (req.body ?? {}) as Partial<Selection>;
      if (!etabId || !serviceId || !prescripteurId) {
        res
          .status(400)
          .json({ error: "etabId, serviceId et prescripteurId requis" });
        return;
      }
      res.json(buildContexte(secret, { etabId, serviceId, prescripteurId }));
    })
  );

  return router;
}
