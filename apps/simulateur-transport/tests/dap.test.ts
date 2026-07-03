import { describe, it, expect } from "vitest";
import { identifie, baseEligible, evalRule } from "./helpers";

const dapNecessaire = (s: Record<string, unknown>) =>
  evalRule("dap . necessaire", s);

describe("dap . necessaire", () => {
  it("motif ouvrant droit standard sans critère DAP → non nécessaire", () => {
    expect(dapNecessaire(baseEligible)).toBe(false);
  });

  it("trajet > 150 km → DAP nécessaire", () => {
    expect(
      dapNecessaire({
        ...baseEligible,
        "question 5 . trajet plus de 150 km aller": "oui",
      })
    ).toBe(true);
  });

  it("avion ou bateau de ligne régulière → DAP nécessaire", () => {
    expect(
      dapNecessaire({
        ...baseEligible,
        "question 5 . avion ou bateau ligne reguliere": "oui",
      })
    ).toBe(true);
  });

  it("transports en série remplissant toutes les conditions → DAP nécessaire", () => {
    expect(
      dapNecessaire({
        ...baseEligible,
        "question 5 . transports en serie": "oui",
        "question 5_1 . au moins 4 transports": "oui",
        "question 5_1 . periode 2 mois": "oui",
        "question 5_1 . meme traitement": "oui",
        "question 5_1 . chaque trajet superieur 50 km aller": "oui",
        "question 5_1 . hors ald": "oui",
      })
    ).toBe(true);
  });

  it("transports en série incomplets → DAP non nécessaire à ce titre", () => {
    expect(
      dapNecessaire({
        ...baseEligible,
        "question 5 . transports en serie": "oui",
        "question 5_1 . au moins 4 transports": "oui",
        "question 5_1 . periode 2 mois": "non",
      })
    ).toBe(false);
    expect(
      evalRule("transports en serie . dap non validee", {
        ...baseEligible,
        "question 5 . transports en serie": "oui",
        "question 5_1 . au moins 4 transports": "oui",
        "question 5_1 . periode 2 mois": "non",
      })
    ).toBe(true);
  });

  it("motif CAMSP/CMPP → DAP nécessaire", () => {
    expect(
      dapNecessaire({
        ...identifie,
        "question 1 . situation particuliere": "'aucune'",
        "question 2 . patient hospitalise": "non",
        "question 3 . motif principal": "'camsp-cmpp'",
      })
    ).toBe(true);
  });

  it("motif SAMSAH → DAP nécessaire", () => {
    expect(
      dapNecessaire({
        ...identifie,
        "question 1 . situation particuliere": "'aucune'",
        "question 2 . patient hospitalise": "non",
        "question 3 . motif principal": "'samsah'",
      })
    ).toBe(true);
  });
});
