// Router de la feature **identification** (backend) : lecture du référentiel
// (établissement / service / prescripteur) + pseudonymisation de l'identité
// saisie. Monté sous `/api` par `server/app.ts`. Voir
// docs/architecture/identification.md — ADR-5.
//
// Prend le `Referentiel` et le secret en paramètres pour rester testable sans
// mock (les tests injectent le snapshot).

import express, { type Router, type Request, type Response } from "express";
import type { Referentiel } from "../../shared/referentiel.ts";
import { saisieComplete, type IdentiteSaisie } from "../../shared/identite-saisie.ts";
import { pseudonymiser } from "./pseudonymisation.ts";

// Enrobe un handler async pour router les rejets vers une réponse d'erreur.
function handle(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((err: unknown) => {
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

  // Pseudonymise l'identité saisie (refs HMAC). Reçoit la saisie brute, renvoie
  // l'objet refs en JSON — le secret HMAC ne quitte jamais le serveur. Le front
  // garde ces refs en mémoire pour Matomo.
  router.post(
    "/identite-pseudonymisee",
    handle(async (req, res) => {
      const saisie = (req.body ?? {}) as IdentiteSaisie;
      if (!saisieComplete(saisie)) {
        res.status(400).json({ error: "sélection d'identification incomplète" });
        return;
      }
      // Alimente le référentiel avec les éventuelles saisies libres (service « autre »,
      // prescripteur hors liste, exercice libéral/CNAM). **Best-effort** : un échec
      // d'écriture ne doit jamais bloquer l'accès au simulateur (dégradation gracieuse).
      // Voir docs/specs/enrichissement-referentiel-saisies-libres.md.
      try {
        await referentiel.enrichirDepuisSaisie?.(saisie);
      } catch (err) {
        console.error("[simulateur] enrichissement référentiel échoué:", err);
      }
      res.json(pseudonymiser(secret, saisie));
    })
  );

  return router;
}
