// @vitest-environment node
//
// Teste l'API référentiel sur le vrai serveur Express, sans mock : on démarre
// l'app avec le référentiel snapshot (comme le fait le backend quand
// GRIST_API_KEY est absente) et on l'interroge par de vraies requêtes HTTP.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../../server/app.ts";
import { empreinte } from "../../server/identification/pseudonymisation.ts";
import { snapshotReferentiel, type Referentiel } from "../../shared/referentiel.ts";
import type { IdentiteSaisie } from "../../shared/identite-saisie.ts";

const SECRET = "secret-de-test";

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp(snapshotReferentiel, { secret: SECRET });
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const { port } = server.address() as AddressInfo;
  base = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

const get = async (path: string) => {
  const res = await fetch(base + path);
  return { status: res.status, body: await res.json() };
};

const post = async (path: string, body: unknown) => {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

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
      expect.objectContaining({ id: "s_chambery_urgences" })
    );
  });

  it("ne renvoie les prescripteurs que pour le service demandé", async () => {
    const { status, body } = await get(
      "/api/prescripteurs?serviceId=s_grenoble_cardio"
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

describe("POST /api/identite-pseudonymisee", () => {
  const selection = {
    etabId: "e_chu_grenoble",
    serviceId: "s_grenoble_cardio",
    prescripteurId: "p_grenoble_cardio_1",
  };

  it("renvoie une identité pseudonymisée (refs HMAC préfixées), sans identifiant brut", async () => {
    const { status, body: ctx } = await post("/api/identite-pseudonymisee", selection);
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
      empreinte(SECRET, `prescripteur:${selection.prescripteurId}`)
    );
    expect(ctx.serviceRef).toBe(empreinte(SECRET, `service:${selection.serviceId}`));
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
      empreinte(SECRET, "identite:dupont|marie")
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

// Démarre une app dédiée sur un référentiel injecté, sans mock (vraie requête HTTP).
async function demarrer(
  referentiel: Referentiel,
  pseudonymesEnClair = false
): Promise<{ base: string; close: () => Promise<void> }> {
  const app = createApp(referentiel, { secret: SECRET, pseudonymesEnClair });
  const srv = await new Promise<Server>((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = srv.address() as AddressInfo;
  return {
    base: `http://127.0.0.1:${port}`,
    close: () =>
      new Promise<void>((resolve, reject) =>
        srv.close((err) => (err ? reject(err) : resolve()))
      ),
  };
}

const postTo = async (base: string, path: string, body: unknown) => {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

describe("POST /api/identite-pseudonymisee — enrichissement du référentiel (saisies libres)", () => {
  // Référentiel double : lit via le snapshot, capture les appels d'enrichissement.
  const appels: IdentiteSaisie[] = [];
  const referentiel: Referentiel = {
    getEtablissements: () => snapshotReferentiel.getEtablissements(),
    getServices: (etabId) => snapshotReferentiel.getServices(etabId),
    getPrescripteurs: (serviceId) => snapshotReferentiel.getPrescripteurs(serviceId),
    async enrichirDepuisSaisie(sel) {
      appels.push(sel);
    },
  };

  let base: string;
  let close: () => Promise<void>;
  beforeAll(async () => ({ base, close } = await demarrer(referentiel)));
  afterAll(() => close());
  beforeEach(() => {
    appels.length = 0;
  });

  it("déclenche l'enrichissement pour un service « Autre » (vrai service saisi)", async () => {
    const sel = {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_autre",
      serviceEstAutre: true,
      serviceLibre: "Néphrologie",
      prescripteurId: "prescripteur_hors_liste",
      nom: "Durand",
      prenom: "Léa",
    };
    const { status } = await postTo(base, "/api/identite-pseudonymisee", sel);
    expect(status).toBe(200);
    expect(appels).toEqual([sel]);
  });

  it("déclenche l'enrichissement pour la branche « prescripteur hors liste »", async () => {
    const sel = {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      prescripteurId: "prescripteur_hors_liste",
      nom: "Dupont",
      prenom: "Marie",
    };
    const { status } = await postTo(base, "/api/identite-pseudonymisee", sel);
    expect(status).toBe(200);
    expect(appels).toEqual([sel]);
  });

  it("appelle quand même l'enrichissement pour une sélection issue des listes (no-op côté source)", async () => {
    // La route délègue toujours ; c'est la source (Grist) qui décide de ne rien écrire.
    const sel = {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      prescripteurId: "p_grenoble_cardio_1",
    };
    const { status } = await postTo(base, "/api/identite-pseudonymisee", sel);
    expect(status).toBe(200);
    expect(appels).toEqual([sel]);
  });

  it("ne bloque pas l'accès si l'enrichissement échoue", async () => {
    const { base: baseKo, close: closeKo } = await demarrer({
      getEtablissements: () => snapshotReferentiel.getEtablissements(),
      getServices: (etabId) => snapshotReferentiel.getServices(etabId),
      getPrescripteurs: (serviceId) => snapshotReferentiel.getPrescripteurs(serviceId),
      async enrichirDepuisSaisie() {
        throw new Error("Grist indisponible");
      },
    });
    try {
      const { status, body: ctx } = await postTo(baseKo, "/api/identite-pseudonymisee", {
        etabId: "e_chu_grenoble",
        serviceId: "s_grenoble_cardio",
        prescripteurId: "prescripteur_hors_liste",
        nom: "Dupont",
        prenom: "Marie",
      });
      expect(status).toBe(200);
      expect(ctx.prescripteurRef).toBe(empreinte(SECRET, "identite:dupont|marie"));
    } finally {
      await closeKo();
    }
  });
});

// Mode debug : `pseudonymesEnClair` renvoie les refs en clair (valeur préfixée)
// au lieu du HMAC, pour lire directement les buckets dans Matomo en phase de test.
describe("POST /api/identite-pseudonymisee — mode debug (refs en clair)", () => {
  let base: string;
  let close: () => Promise<void>;
  beforeAll(async () => ({ base, close } = await demarrer(snapshotReferentiel, true)));
  afterAll(() => close());

  it("renvoie les refs en clair (valeur préfixée), pas le HMAC", async () => {
    const { status, body: ctx } = await postTo(base, "/api/identite-pseudonymisee", {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      prescripteurId: "p_grenoble_cardio_1",
    });
    expect(status).toBe(200);
    expect(ctx.etabRef).toBe("etab:e_chu_grenoble");
    expect(ctx.serviceRef).toBe("service:s_grenoble_cardio");
    expect(ctx.prescripteurRef).toBe("prescripteur:p_grenoble_cardio_1");
  });

  it("expose l'identité libre en clair (nom/prénom normalisés) pour le debug", async () => {
    const { body: ctx } = await postTo(base, "/api/identite-pseudonymisee", {
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      prescripteurId: "prescripteur_hors_liste",
      nom: "Dupont",
      prenom: "Marie",
    });
    expect(ctx.prescripteurRef).toBe("identite:dupont|marie");
  });
});
