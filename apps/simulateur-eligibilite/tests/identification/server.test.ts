// @vitest-environment node
//
// Teste l'API référentiel sur le vrai serveur Express, sans mock : on démarre
// l'app avec le référentiel snapshot (comme le fait le backend quand
// GRIST_API_KEY est absente) et on l'interroge par de vraies requêtes HTTP.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { empreinte } from "../../server/identification/pseudonymisation.ts";
import { snapshotReferentiel } from "../../shared/referentiel.ts";
import {
  type AppDeTest,
  demarrer,
  getFrom,
  postTo,
  SECRET,
} from "./serveur-de-test.ts";

let app: AppDeTest;
beforeAll(async () => {
  app = await demarrer(snapshotReferentiel);
});
afterAll(() => app.close());

const get = (path: string) => getFrom(app.base, path);
const post = (path: string, body: unknown) => postTo(app.base, path, body);

describe("API référentiel", () => {
  it("liste les établissements", async () => {
    const { status, body } = await get("/api/etablissements");
    expect(status).toBe(200);
    expect(body).toContainEqual({
      id: "e_chu_grenoble",
      libelle: "CHU Grenoble Alpes",
    });
  });

  it("filtre les services par établissement", async () => {
    const { status, body } = await get("/api/services?etabId=e_chu_grenoble");
    expect(status).toBe(200);
    expect(body).toContainEqual({
      id: "s_grenoble_cardio",
      libelle: "Cardiologie",
    });
    expect(body).not.toContainEqual(
      expect.objectContaining({ id: "s_chambery_urgences" }),
    );
  });

  it("n'expose plus la liste des prescripteurs", async () => {
    const { status } = await get(
      "/api/prescripteurs?serviceId=s_grenoble_cardio",
    );
    expect(status).toBe(404);
  });

  it("exige le paramètre etabId pour les services", async () => {
    const { status, body } = await get("/api/services");
    expect(status).toBe(400);
    expect(body).toEqual({ error: "etabId requis" });
  });

  it("répond 404 JSON pour une route /api inconnue", async () => {
    const { status } = await get("/api/inconnu");
    expect(status).toBe(404);
  });
});

describe("non-indexation par les moteurs", () => {
  it("sert un X-Robots-Tag noindex sur toutes les réponses", async () => {
    const res = await fetch(`${app.base}/api/etablissements`);
    expect(res.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  });

  it("sert un robots.txt qui interdit tout", async () => {
    const res = await fetch(`${app.base}/robots.txt`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/plain/);
    expect(await res.text()).toContain("Disallow: /");
  });
});

describe("POST /api/identite-pseudonymisee", () => {
  const selection = {
    etabId: "e_chu_grenoble",
    serviceId: "s_grenoble_cardio",
  };

  it("pseudonymise l'établissement et le service seuls, sans identifiant brut", async () => {
    const { status, body: ctx } = await post(
      "/api/identite-pseudonymisee",
      selection,
    );
    expect(status).toBe(200);

    expect(Object.keys(ctx).sort()).toEqual(["etabRef", "serviceRef", "v"]);
    expect(ctx.v).toBe(3);

    // Les refs sont le HMAC de la valeur **préfixée par sa nature** — jamais l'id brut.
    expect(ctx.etabRef).toBe(empreinte(SECRET, `etab:${selection.etabId}`));
    expect(ctx.serviceRef).toBe(
      empreinte(SECRET, `service:${selection.serviceId}`),
    );
    expect(JSON.stringify(ctx)).not.toContain(selection.serviceId);
  });

  it("est déterministe pour une même sélection", async () => {
    const a = await post("/api/identite-pseudonymisee", selection);
    const b = await post("/api/identite-pseudonymisee", selection);
    expect(a.body).toEqual(b.body);
  });

  it("service « Autre » : serviceRef reste l'id référentiel, le service saisi ne sort pas", async () => {
    const { status, body: ctx } = await post("/api/identite-pseudonymisee", {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_autre",
      serviceEstAutre: true,
      serviceLibre: "Néphrologie",
    });
    expect(status).toBe(200);
    // Le serviceRef reste l'id « Autre » du référentiel (le vrai service n'a pas
    // encore d'id à ce stade) ; l'analytics est buckettée sous « Autre » à la 1ʳᵉ
    // visite, puis sous le vrai service ensuite.
    expect(ctx.serviceRef).toBe(empreinte(SECRET, "service:s_grenoble_autre"));
    expect(JSON.stringify(ctx)).not.toMatch(/néphrologie/i);
  });

  it("service « Autre » sans service réel saisi → 400 (saisie obligatoire)", async () => {
    const { status, body } = await post("/api/identite-pseudonymisee", {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_autre",
      serviceEstAutre: true,
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/incompl/);
  });

  it("refuse une sélection incomplète", async () => {
    const { status, body } = await post("/api/identite-pseudonymisee", {
      etabId: "e_chu_grenoble",
      // service manquant
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/incompl/);
  });
});
