// @vitest-environment node
//
// L'écriture de la saisie libre dans le référentiel. Chaque cas démarre sa propre
// app, avec un référentiel injecté : un double qui capture, ou un en panne.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { RattachementSaisi } from "../../../shared/rattachement-saisi.ts";
import {
  type Referentiel,
  snapshotReferentiel,
} from "../../../shared/referentiel.ts";
import { demarrer, postTo } from "./serveur-de-test.ts";

describe("POST /api/rattachement : enrichissement du référentiel (service « Autre »)", () => {
  // Référentiel double : lit le snapshot, capture les appels d'enrichissement.
  const appels: RattachementSaisi[] = [];
  const referentiel: Referentiel = {
    ...snapshotReferentiel,
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
    };
    const { status } = await postTo(base, "/api/rattachement", sel);
    expect(status).toBe(204);
    expect(appels).toEqual([sel]);
  });

  it("appelle quand même l'enrichissement pour une sélection issue des listes (no-op côté source)", async () => {
    // La route délègue toujours. La source (Grist) décide de ne rien écrire.
    const sel = { etabId: "e_chu_grenoble", serviceId: "s_grenoble_cardio" };
    const { status } = await postTo(base, "/api/rattachement", sel);
    expect(status).toBe(204);
    expect(appels).toEqual([sel]);
  });

  it("ne bloque pas l'accès si l'enrichissement échoue", async () => {
    const { base: baseKo, close: closeKo } = await demarrer({
      ...snapshotReferentiel,
      async enrichirDepuisSaisie() {
        throw new Error("Grist indisponible");
      },
    });
    try {
      const { status } = await postTo(baseKo, "/api/rattachement", {
        etabId: "e_chu_grenoble",
        serviceId: "s_grenoble_autre",
        serviceEstAutre: true,
        serviceLibre: "Néphrologie",
      });
      expect(status).toBe(204);
    } finally {
      await closeKo();
    }
  });
});
