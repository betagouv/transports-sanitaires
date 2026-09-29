// @vitest-environment node
//
// L'écriture de la saisie libre dans le référentiel, et le mode debug qui renvoie
// les refs en clair. Chaque bloc démarre sa propre app : le référentiel y est
// injecté (double capturant, ou snapshot), ce que l'app partagée ne permet pas.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { empreinte } from "../../server/rattachement/pseudonymisation.ts";
import type { RattachementSaisi } from "../../shared/rattachement-saisi.ts";
import {
  type Referentiel,
  snapshotReferentiel,
} from "../../shared/referentiel.ts";
import { demarrer, postTo, SECRET } from "./serveur-de-test.ts";

describe("POST /api/rattachement-pseudonymise — enrichissement du référentiel (service « Autre »)", () => {
  // Référentiel double : lit via le snapshot, capture les appels d'enrichissement.
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
    const { status } = await postTo(
      base,
      "/api/rattachement-pseudonymise",
      sel,
    );
    expect(status).toBe(200);
    expect(appels).toEqual([sel]);
  });

  it("appelle quand même l'enrichissement pour une sélection issue des listes (no-op côté source)", async () => {
    // La route délègue toujours ; c'est la source (Grist) qui décide de ne rien écrire.
    const sel = { etabId: "e_chu_grenoble", serviceId: "s_grenoble_cardio" };
    const { status } = await postTo(
      base,
      "/api/rattachement-pseudonymise",
      sel,
    );
    expect(status).toBe(200);
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
      const { status, body: ctx } = await postTo(
        baseKo,
        "/api/rattachement-pseudonymise",
        {
          etabId: "e_chu_grenoble",
          serviceId: "s_grenoble_autre",
          serviceEstAutre: true,
          serviceLibre: "Néphrologie",
        },
      );
      expect(status).toBe(200);
      expect(ctx.serviceRef).toBe(
        empreinte(SECRET, "service:s_grenoble_autre"),
      );
    } finally {
      await closeKo();
    }
  });
});

// Mode debug : `pseudonymesEnClair` renvoie les refs en clair (valeur préfixée)
// au lieu du HMAC, pour lire directement les buckets dans Matomo en phase de test.
describe("POST /api/rattachement-pseudonymise — mode debug (refs en clair)", () => {
  let base: string;
  let close: () => Promise<void>;
  beforeAll(
    async () => ({ base, close } = await demarrer(snapshotReferentiel, true)),
  );
  afterAll(() => close());

  it("renvoie les refs en clair (valeur préfixée), pas le HMAC", async () => {
    const { status, body: ctx } = await postTo(
      base,
      "/api/rattachement-pseudonymise",
      { etabId: "e_chu_grenoble", serviceId: "s_grenoble_cardio" },
    );
    expect(status).toBe(200);
    expect(ctx).toEqual({
      etabRef: "etab:e_chu_grenoble",
      serviceRef: "service:s_grenoble_cardio",
      v: 3,
    });
  });
});
