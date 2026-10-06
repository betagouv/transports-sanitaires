// Les routes du rattachement, montées sous `/api` : lire le référentiel, et
// recevoir un rattachement saisi.

import express, { type Request, type Response, type Router } from "express";
import {
  type RattachementSaisi,
  saisieComplete,
} from "../../shared/rattachement-saisi.ts";
import type { Referentiel } from "../../shared/referentiel.ts";

export function rattachementRoutes(referentiel: Referentiel): Router {
  const router = express.Router();

  router.get(
    "/etablissements",
    handle(async (_req, res) => {
      res.json(await referentiel.listerEtablissements());
    }),
  );
  router.get("/services", handle(servicesDe(referentiel)));
  router.post("/rattachement", handle(rattacher(referentiel)));

  return router;
}

// ---- implémentation ----

// Reçoit le rattachement saisi pour en tirer ce qui manque au référentiel. Rien à
// renvoyer : le front a déjà tout ce qu'il lui faut, et n'attend pas la réponse.
function rattacher(referentiel: Referentiel) {
  return async (req: Request, res: Response) => {
    const saisie = (req.body ?? {}) as RattachementSaisi;
    if (!saisieComplete(saisie)) {
      res.status(400).json({ error: "sélection de rattachement incomplète" });
      return;
    }
    await enrichir(referentiel, saisie);
    res.status(204).end();
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
