// @vitest-environment node
//
// Teste l'API référentiel sur le vrai serveur Express, sans mock : on démarre
// l'app avec le référentiel snapshot (comme le fait le backend quand
// GRIST_API_KEY est absente) et on l'interroge par de vraies requêtes HTTP.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { snapshotReferentiel } from "../../shared/referentiel.ts";
import {
  type AppDeTest,
  demarrer,
  getFrom,
  postTo,
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

describe("POST /api/rattachement", () => {
  const selection = {
    etabId: "e_chu_grenoble",
    serviceId: "s_grenoble_cardio",
  };

  it("accepte le rattachement sans rien renvoyer", async () => {
    const { status, body } = await post("/api/rattachement", selection);
    expect(status).toBe(204);
    expect(body).toBeUndefined();
  });

  it("service « Autre » sans service réel saisi → 400 (saisie obligatoire)", async () => {
    const { status, body } = await post("/api/rattachement", {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_autre",
      serviceEstAutre: true,
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/incompl/);
  });

  it("refuse une sélection incomplète", async () => {
    const { status, body } = await post("/api/rattachement", {
      etabId: "e_chu_grenoble",
      // service manquant
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/incompl/);
  });
});
