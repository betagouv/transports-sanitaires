// Router de la feature **rattachement** (backend) : lecture du référentiel
// (établissement, service) et pseudonymisation du rattachement saisi. Monté sous
// `/api` par `server/app.ts`. Voir docs/knowledge/adr/identification.md, ADR-5.
//
// Prend le `Referentiel` et le secret en paramètres pour rester testable sans
// mock (les tests injectent le snapshot).

import express, { type Request, type Response, type Router } from "express";
import {
  type RattachementSaisi,
  saisieComplete,
} from "../../shared/rattachement-saisi.ts";
import type { Referentiel } from "../../shared/referentiel.ts";
import { pseudonymiser } from "./pseudonymisation.ts";

export function rattachementRoutes(
  referentiel: Referentiel,
  secret: string,
  pseudonymesEnClair = false,
): Router {
  const router = express.Router();

  router.get(
    "/etablissements",
    handle(async (_req, res) => {
      res.json(await referentiel.listerEtablissements());
    }),
  );
  router.get("/services", handle(servicesDe(referentiel)));
  router.post(
    "/rattachement-pseudonymise",
    handle(rattacher(referentiel, secret, pseudonymesEnClair)),
  );

  return router;
}

// ---- implémentation ----

// Pseudonymise le rattachement saisi (refs HMAC). Reçoit la saisie brute, renvoie
// l'objet refs en JSON : le secret HMAC ne quitte jamais le serveur. Le front
// garde ces refs en mémoire pour Matomo.
function rattacher(
  referentiel: Referentiel,
  secret: string,
  pseudonymesEnClair: boolean,
) {
  return async (req: Request, res: Response) => {
    const saisie = (req.body ?? {}) as RattachementSaisi;
    if (!saisieComplete(saisie)) {
      res.status(400).json({ error: "sélection de rattachement incomplète" });
      return;
    }
    await enrichir(referentiel, saisie);
    res.json(pseudonymiser(secret, saisie, pseudonymesEnClair));
  };
}

// Les services d'un établissement : l'établissement est obligatoire en query.
function servicesDe(referentiel: Referentiel) {
  return async (req: Request, res: Response) => {
    const etabId = String(req.query.etabId ?? "");
    if (!etabId) {
      res.status(400).json({ error: "etabId requis" });
      return;
    }
    res.json(await referentiel.listerServices(etabId));
  };
}

// Alimente le référentiel avec l'éventuel service saisi sous « Autre ».
// **Best-effort** : un échec d'écriture ne doit jamais bloquer l'accès au
// simulateur (dégradation gracieuse). Voir
// docs/knowledge/domain/enrichissement-referentiel-rattachement.md.
async function enrichir(referentiel: Referentiel, saisie: RattachementSaisi) {
  try {
    await referentiel.enrichirDepuisSaisie?.(saisie);
  } catch (err) {
    console.error("[simulateur] enrichissement référentiel échoué:", err);
  }
}

// Enrobe un handler async pour router les rejets vers une réponse d'erreur.
function handle(handler: (req: Request, res: Response) => Promise<void>) {
  return (req: Request, res: Response) => {
    handler(req, res).catch((err: unknown) => {
      console.error("[simulateur] erreur référentiel:", err);
      res.status(502).json({ error: "referentiel indisponible" });
    });
  };
}
