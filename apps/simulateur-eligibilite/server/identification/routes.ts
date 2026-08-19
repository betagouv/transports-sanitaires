// Router de la feature **identification** (backend) : lecture du référentiel
// (établissement / service / prescripteur) + pseudonymisation de l'identité
// saisie. Monté sous `/api` par `server/app.ts`. Voir
// docs/architecture/identification.md — ADR-5.
//
// Prend le `Referentiel` et le secret en paramètres pour rester testable sans
// mock (les tests injectent le snapshot).

import express, { type Request, type Response, type Router } from "express";
import {
  type IdentiteSaisie,
  saisieComplete,
} from "../../shared/identite-saisie.ts";
import type { Referentiel } from "../../shared/referentiel.ts";
import { pseudonymiser } from "./pseudonymisation.ts";

export function identificationRoutes(
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
  router.get(
    "/services",
    handle(lister("etabId", (id) => referentiel.listerServices(id))),
  );
  router.get(
    "/prescripteurs",
    handle(lister("serviceId", (id) => referentiel.listerPrescripteurs(id))),
  );
  router.post(
    "/identite-pseudonymisee",
    handle(identifier(referentiel, secret, pseudonymesEnClair)),
  );

  return router;
}

// ---- implémentation ----

// Pseudonymise l'identité saisie (refs HMAC). Reçoit la saisie brute, renvoie
// l'objet refs en JSON — le secret HMAC ne quitte jamais le serveur. Le front
// garde ces refs en mémoire pour Matomo.
function identifier(
  referentiel: Referentiel,
  secret: string,
  pseudonymesEnClair: boolean,
) {
  return async (req: Request, res: Response) => {
    const saisie = (req.body ?? {}) as IdentiteSaisie;
    if (!saisieComplete(saisie)) {
      res.status(400).json({ error: "sélection d'identification incomplète" });
      return;
    }
    await enrichir(referentiel, saisie);
    res.json(pseudonymiser(secret, saisie, pseudonymesEnClair));
  };
}

// Les services d'un établissement, les prescripteurs d'un service : même forme —
// un identifiant parent obligatoire en query, la liste filtrée en réponse.
function lister(
  parametre: string,
  charger: (valeur: string) => Promise<unknown>,
) {
  return async (req: Request, res: Response) => {
    const valeur = String(req.query[parametre] ?? "");
    if (!valeur) {
      res.status(400).json({ error: `${parametre} requis` });
      return;
    }
    res.json(await charger(valeur));
  };
}

// Alimente le référentiel avec les éventuelles saisies libres (service « autre »,
// prescripteur hors liste, exercice libéral/CNAM). **Best-effort** : un échec
// d'écriture ne doit jamais bloquer l'accès au simulateur (dégradation gracieuse).
// Voir docs/specs/enrichissement-referentiel-saisies-libres.md.
async function enrichir(referentiel: Referentiel, saisie: IdentiteSaisie) {
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
