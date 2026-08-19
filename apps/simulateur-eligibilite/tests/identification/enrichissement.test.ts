// @vitest-environment node
//
// L'écriture des saisies libres dans le référentiel, et le mode debug qui renvoie
// les refs en clair. Chaque bloc démarre sa propre app : le référentiel y est
// injecté (double capturant, ou snapshot), ce que l'app partagée ne permet pas.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { empreinte } from "../../server/identification/pseudonymisation.ts";
import type { IdentiteSaisie } from "../../shared/identite-saisie.ts";
import {
  type Referentiel,
  snapshotReferentiel,
} from "../../shared/referentiel.ts";
import { demarrer, postTo, SECRET } from "./serveur-de-test.ts";

describe("POST /api/identite-pseudonymisee — enrichissement du référentiel (saisies libres)", () => {
  // Référentiel double : lit via le snapshot, capture les appels d'enrichissement.
  const appels: IdentiteSaisie[] = [];
  const referentiel: Referentiel = {
    listerEtablissements: () => snapshotReferentiel.listerEtablissements(),
    listerServices: (etabId) => snapshotReferentiel.listerServices(etabId),
    listerPrescripteurs: (serviceId) =>
      snapshotReferentiel.listerPrescripteurs(serviceId),
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
      listerEtablissements: () => snapshotReferentiel.listerEtablissements(),
      listerServices: (etabId) => snapshotReferentiel.listerServices(etabId),
      listerPrescripteurs: (serviceId) =>
        snapshotReferentiel.listerPrescripteurs(serviceId),
      async enrichirDepuisSaisie() {
        throw new Error("Grist indisponible");
      },
    });
    try {
      const { status, body: ctx } = await postTo(
        baseKo,
        "/api/identite-pseudonymisee",
        {
          etabId: "e_chu_grenoble",
          serviceId: "s_grenoble_cardio",
          prescripteurId: "prescripteur_hors_liste",
          nom: "Dupont",
          prenom: "Marie",
        },
      );
      expect(status).toBe(200);
      expect(ctx.prescripteurRef).toBe(
        empreinte(SECRET, "identite:dupont|marie"),
      );
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
  beforeAll(
    async () => ({ base, close } = await demarrer(snapshotReferentiel, true)),
  );
  afterAll(() => close());

  it("renvoie les refs en clair (valeur préfixée), pas le HMAC", async () => {
    const { status, body: ctx } = await postTo(
      base,
      "/api/identite-pseudonymisee",
      {
        etabId: "e_chu_grenoble",
        serviceId: "s_grenoble_cardio",
        prescripteurId: "p_grenoble_cardio_1",
      },
    );
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
