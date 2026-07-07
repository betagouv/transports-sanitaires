// @vitest-environment node
//
// Teste l'API référentiel sur le vrai serveur Express, sans mock : on démarre
// l'app avec le référentiel snapshot (comme le fait le backend quand
// GRIST_API_KEY est absente) et on l'interroge par de vraies requêtes HTTP.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createApp } from "../server/app.ts";
import { snapshotReferentiel } from "../src/referentiel.ts";

let server: Server;
let base: string;

beforeAll(async () => {
  const app = createApp(snapshotReferentiel);
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
