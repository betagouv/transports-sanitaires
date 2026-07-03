import { describe, it, expect } from "vitest";
import { identifie, baseEligible, evalRule } from "./helpers";

describe("checklist", () => {
  it("cas PMT → générer PMT, pas de DAP", () => {
    const s = {
      ...baseEligible,
      "question 6 . individuel commun . autonome": "oui",
    };
    expect(evalRule("checklist . generer pmt", s)).toBe(true);
    expect(evalRule("checklist . generer dap", s)).toBe(false);
    expect(evalRule("checklist . texte mode", s)).toMatch(
      /véhicule personnel/i
    );
  });

  it("cas DAP → générer DAP, pas de PMT", () => {
    const s = {
      ...baseEligible,
      "question 6 . individuel commun . autonome": "oui",
      "question 5 . trajet plus de 150 km aller": "oui",
    };
    expect(evalRule("checklist . generer dap", s)).toBe(true);
    expect(evalRule("checklist . generer pmt", s)).toBe(false);
  });

  it("ambulance → texte mode 'ambulance'", () => {
    expect(
      evalRule("checklist . texte mode", {
        ...baseEligible,
        "question 6 . ambulance . oxygene": "oui",
      })
    ).toMatch(/ambulance/i);
  });
});

describe("resultat . prescripteur . alerte", () => {
  it("motif SAMSAH → alerte de vigilance", () => {
    expect(
      evalRule("resultat . prescripteur . alerte", {
        ...identifie,
        "question 1 . situation particuliere": "'aucune'",
        "question 2 . patient hospitalise": "non",
        "question 3 . motif principal": "'samsah'",
        "question 6 . individuel commun . autonome": "oui",
      })
    ).toMatch(/SAMSAH/i);
  });

  it("transports en série incomplets → alerte transports en série", () => {
    expect(
      evalRule("resultat . prescripteur . alerte", {
        ...baseEligible,
        "question 6 . individuel commun . autonome": "oui",
        "question 5 . transports en serie": "oui",
        "question 5_1 . au moins 4 transports": "oui",
        "question 5_1 . periode 2 mois": "non",
      })
    ).toMatch(/transports en s[ée]rie/i);
  });

  it("cas simple sans particularité → pas d'alerte", () => {
    expect(
      evalRule("resultat . prescripteur . alerte", {
        ...baseEligible,
        "question 6 . individuel commun . autonome": "oui",
      })
    ).toBe("");
  });
});
