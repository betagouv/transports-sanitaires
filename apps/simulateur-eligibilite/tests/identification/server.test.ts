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

  it("ne renvoie les prescripteurs que pour le service demandé", async () => {
    const { status, body } = await get(
      "/api/prescripteurs?serviceId=s_grenoble_cardio",
    );
    expect(status).toBe(200);
    expect(body).toEqual([
      { id: "p_grenoble_cardio_1", libelle: "Dr Amina Berger" },
      { id: "p_grenoble_cardio_2", libelle: "Dr Louis Fontaine" },
    ]);
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
    prescripteurId: "p_grenoble_cardio_1",
  };

  it("renvoie une identité pseudonymisée (refs HMAC préfixées), sans identifiant brut", async () => {
    const { status, body: ctx } = await post(
      "/api/identite-pseudonymisee",
      selection,
    );
    expect(status).toBe(200);

    expect(Object.keys(ctx).sort()).toEqual([
      "etabRef",
      "prescripteurRef",
      "serviceRef",
      "v",
    ]);
    expect(ctx.v).toBe(2);

    // Les refs sont le HMAC de la valeur **préfixée par sa nature** — jamais l'id brut.
    expect(ctx.prescripteurRef).toBe(
      empreinte(SECRET, `prescripteur:${selection.prescripteurId}`),
    );
    expect(ctx.serviceRef).toBe(
      empreinte(SECRET, `service:${selection.serviceId}`),
    );
    expect(JSON.stringify(ctx)).not.toContain(selection.prescripteurId);
  });

  it("est déterministe pour une même sélection", async () => {
    const a = await post("/api/identite-pseudonymisee", selection);
    const b = await post("/api/identite-pseudonymisee", selection);
    expect(a.body).toEqual(b.body);
  });

  it("branche libre (hors liste) : identité HMAC, jamais le nom en clair", async () => {
    const { status, body: ctx } = await post("/api/identite-pseudonymisee", {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      prescripteurId: "prescripteur_hors_liste",
      nom: "Dupont",
      prenom: "Marie",
    });
    expect(status).toBe(200);
    expect(ctx.prescripteurRef).toBe(
      empreinte(SECRET, "identite:dupont|marie"),
    );
    // normalisation (casse/espaces) → même bucket
    const variante = await post("/api/identite-pseudonymisee", {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      prescripteurId: "prescripteur_hors_liste",
      nom: "  DUPONT ",
      prenom: "Marie",
    });
    expect(variante.body.prescripteurRef).toBe(ctx.prescripteurRef);
    expect(JSON.stringify(ctx)).not.toMatch(/dupont|marie/i);
  });

  it("service « Autre » : serviceRef (id référentiel) + prescripteurRef (identité si hors liste)", async () => {
    const { status, body: ctx } = await post("/api/identite-pseudonymisee", {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_autre",
      serviceEstAutre: true,
      serviceLibre: "Néphrologie",
      prescripteurId: "prescripteur_hors_liste",
      nom: "Durand",
      prenom: "Léa",
    });
    expect(status).toBe(200);
    // Le serviceRef reste l'id « Autre » du référentiel (le vrai service n'a pas
    // encore d'id à ce stade) ; l'analytics est buckettée sous « Autre » à la 1ʳᵉ
    // visite, puis sous le vrai service ensuite. Voir la spec.
    expect(ctx.serviceRef).toBe(empreinte(SECRET, "service:s_grenoble_autre"));
    expect(ctx.prescripteurRef).toBe(empreinte(SECRET, "identite:durand|léa"));
    expect(JSON.stringify(ctx)).not.toMatch(/durand|léa|néphrologie/i);
  });

  it("service « Autre » sans service réel saisi → 400 (saisie obligatoire)", async () => {
    const { status, body } = await post("/api/identite-pseudonymisee", {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_autre",
      serviceEstAutre: true,
      prescripteurId: "prescripteur_hors_liste",
      nom: "Durand",
      prenom: "Léa",
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/incompl/);
  });

  it("refuse une sélection incomplète", async () => {
    const { status, body } = await post("/api/identite-pseudonymisee", {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      // prescripteur manquant
    });
    expect(status).toBe(400);
    expect(body.error).toMatch(/incompl/);
  });
});
