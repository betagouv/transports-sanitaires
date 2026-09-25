// La campagne v9.7.3 de l'éditeur sur les contradictions de motif, de trajet
// et d'exceptions (`tests/campagne-v973/routes.mjs`), côté exceptions et
// permissions, rejouée au moteur sous ses identifiants `ROUTE-*`. Ce qui ne
// se transpose pas est dit en tête de `campagne-routes-lieux-v9-7-3.test.ts`.

import { describe, expect, it } from "vitest";
import {
  aboutitEntre,
  casFinal,
  ENTRY,
  ER,
  EXAM,
  EXIT,
  estRefuse,
  PERMISSION,
  PMT,
  pour,
  S3141,
  STRUCTURE,
  TRANSFER,
} from "./trajet-du-livrable";

describe("ROUTE, retour pénitentiaire (AUD-ROUTE-PRISON-CONTEXT)", () => {
  const retour = { contexts: { p2_contexte_retour_penitentiaire: "oui" } };
  it("ROUTE-PRISON-CONFLICT-1 (entrée)", () => {
    estRefuse(pour(ENTRY, retour));
  });
  it("ROUTE-PRISON-CONFLICT-2 (permission)", () => {
    estRefuse(pour(PERMISSION, retour));
  });
  it("ROUTE-PRISON-CONFLICT-3 (urgences)", () => {
    estRefuse(pour(ER, retour));
  });
  it("ROUTE-PRISON-VALID", () => {
    aboutitEntre(pour(EXIT, retour), STRUCTURE, "Établissement pénitentiaire");
  });
  it("ROUTE-PRISON-HAD-REFUSED", () => {
    estRefuse(
      pour(TRANSFER, {
        ...retour,
        exceptions: { p2_exception_admission_had: "oui" },
      }),
    );
  });
});

describe("ROUTE, exceptions EHPAD et USLD (AUD-ROUTE-EXCEPTION-PLACE)", () => {
  for (const [type, cle] of [
    ["EHPAD", "p2_exception_ehpad"],
    ["USLD", "p2_exception_usld"],
  ] as const) {
    const exceptions = { [cle]: "oui" };
    it.each([
      [1, "Domicile", "Autre lieu"],
      [2, "Autre lieu", "Domicile"],
    ])(`ROUTE-EXCEPTION-${type}-INVALID-%i`, (_rang, depart, arrival) => {
      estRefuse(pour(TRANSFER, { depart, arrival, exceptions }));
    });
    it.each([
      [1, type, STRUCTURE],
      [2, STRUCTURE, type],
    ])(`ROUTE-EXCEPTION-${type}-VALID-%i`, (_rang, depart, arrival) => {
      aboutitEntre(
        pour(TRANSFER, { depart, arrival, exceptions }),
        depart,
        arrival,
      );
    });
  }
});

describe("ROUTE, exception radiothérapie (AUD-ROUTE-RADIO-*)", () => {
  const seance = { p1_m0_seance_radiotherapie: "oui" };
  const exceptions = { p2_exception_radiotherapie_moins_48h: "oui" };
  it("ROUTE-RADIO-LT48-VALID", () => {
    const situation = pour(TRANSFER, {
      m0: seance,
      exceptions,
      overrides: { p2_transfert_motif_detail: "'Séance de radiothérapie'" },
    });
    expect(casFinal(situation)).toBe(PMT);
  });
  it("ROUTE-RADIO-DEFINITIVE-CONFLICT", () => {
    estRefuse(
      pour(TRANSFER, {
        m0: seance,
        exceptions,
        overrides: { p2_nature_transfert: "'Définitif'" },
      }),
    );
  });
  it("ROUTE-RADIO-MEDICAL-CONFLICT", () => {
    estRefuse(
      pour(TRANSFER, {
        m0: { p1_m0_aucun: "oui" },
        exceptions,
        overrides: { p2_transfert_motif_detail: "'Imagerie médicale'" },
      }),
    );
  });
  it("ROUTE-RADIO-MEDICAL-CONTROL", () => {
    estRefuse(
      pour(TRANSFER, {
        m0: { p1_m0_aucun: "oui" },
        depart: "EHPAD",
        exceptions: { p2_exception_ehpad: "oui" },
        overrides: { p2_transfert_motif_detail: "'Séance de radiothérapie'" },
      }),
    );
  });
});

describe("ROUTE, admission HAD et permissions", () => {
  it("ROUTE-HAD-VALID", () => {
    aboutitEntre(
      pour(TRANSFER, { exceptions: { p2_exception_admission_had: "oui" } }),
      STRUCTURE,
      "Domicile",
    );
  });
  it("ROUTE-PERMISSION-RETURN-VALID", () => {
    const retour = pour(PERMISSION, {
      depart: "Domicile",
      arrival: STRUCTURE,
      organization: "trajets simples",
    });
    expect(casFinal(retour)).toBe(S3141);
  });
  it("ROUTE-PERMISSION-HOSP-HOSP-REFUSED", () => {
    estRefuse(pour(PERMISSION, { arrival: STRUCTURE }));
  });
  it("ROUTE-DOMICILE-DOMICILE-REFUSED", () => {
    estRefuse(pour(EXAM, { arrival: "Domicile" }));
  });
});
