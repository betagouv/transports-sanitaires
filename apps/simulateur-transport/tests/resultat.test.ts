import { describe, it, expect } from "vitest";
import { baseEligible, evalRule } from "./helpers";

const statut = (s: Record<string, unknown>) => evalRule("resultat . statut", s);
const document = (s: Record<string, unknown>) =>
  evalRule("resultat . document", s);
const mode = (s: Record<string, unknown>) =>
  evalRule("resultat . mode transport", s);

describe("resultat . statut", () => {
  it("situation vide (aucun motif par défaut) → patient non éligible", () => {
    expect(statut({})).toBe("patient-non-eligible");
    expect(document({})).toBe("aucun-document-assurance-maladie");
  });

  it("motif hospitalisation + mode individuel → patient éligible (PMT)", () => {
    const s = {
      ...baseEligible,
      "question 6 . individuel commun . autonome": "oui",
    };
    expect(statut(s)).toBe("patient-eligible");
    expect(document(s)).toBe("pmt");
    expect(mode(s)).toBe("vehicule-personnel-ou-transport-commun");
  });

  it("trajet > 150 km → éligible sous réserve d'accord préalable (DAP)", () => {
    const s = {
      ...baseEligible,
      "question 6 . individuel commun . autonome": "oui",
      "question 5 . trajet plus de 150 km aller": "oui",
    };
    expect(statut(s)).toBe("patient-eligible-sous-reserve-accord-prealable");
    expect(document(s)).toBe("dap");
  });

  it("convocation contrôle sécurité sociale → convocation valant prescription", () => {
    const s = {
      "question 1 . situation particuliere": "'aucune'",
      "question 2 . patient hospitalise": "non",
      "question 3 . motif principal": "'convocation-controle-securite-sociale'",
    };
    expect(statut(s)).toBe(
      "patient-eligible-convocation-valant-prescription"
    );
    expect(document(s)).toBe("convocation-ou-avis");
  });

  it("SMUR → situation hors parcours Assurance Maladie standard", () => {
    const s = {
      "question 1 . situation particuliere": "'smur'",
    };
    expect(statut(s)).toBe(
      "situation-hors-parcours-assurance-maladie-standard"
    );
    expect(document(s)).toBe("procedure-locale-ou-etablissement");
  });

  it("patient hospitalisé sans exception → hors parcours", () => {
    const s = {
      "question 1 . situation particuliere": "'aucune'",
      "question 2 . patient hospitalise": "oui",
      "question 2_1 . exception assurance maladie": "'aucune'",
    };
    expect(statut(s)).toBe(
      "situation-hors-parcours-assurance-maladie-standard"
    );
  });

  it("contrainte bariatrique uniquement → patient non éligible", () => {
    const s = {
      "question 1 . situation particuliere": "'contrainte-bariatrique-uniquement'",
    };
    expect(statut(s)).toBe("patient-non-eligible");
    expect(document(s)).toBe("aucun-document-assurance-maladie");
  });

  it("aucun motif → patient non éligible", () => {
    const s = {
      "question 1 . situation particuliere": "'aucune'",
      "question 2 . patient hospitalise": "non",
      "question 3 . motif principal": "'aucun'",
    };
    expect(statut(s)).toBe("patient-non-eligible");
  });

  it("motif ouvrant droit mais aucun mode justifié → non éligible", () => {
    // hospitalisation mais aucune question 6 renseignée
    expect(statut(baseEligible)).toBe("patient-non-eligible");
  });
});

describe("resultat . mode transport", () => {
  it("ambulance justifiée → ambulance", () => {
    expect(
      mode({ ...baseEligible, "question 6 . ambulance . oxygene": "oui" })
    ).toBe("ambulance");
  });

  it("fauteuil roulant sans transfert → VSL/taxi TPMR", () => {
    expect(
      mode({
        ...baseEligible,
        "question 6 . tpmr . fauteuil roulant sans transfert": "oui",
      })
    ).toBe("vsl-ou-taxi-tpmr");
  });

  it("aide au déplacement → VSL/taxi conventionné", () => {
    expect(
      mode({
        ...baseEligible,
        "question 6 . vsl taxi . aide au deplacement": "oui",
      })
    ).toBe("vsl-ou-taxi-conventionne");
  });

  it("patient autonome → véhicule personnel / transport en commun", () => {
    expect(
      mode({
        ...baseEligible,
        "question 6 . individuel commun . autonome": "oui",
      })
    ).toBe("vehicule-personnel-ou-transport-commun");
  });

  it("ambulance prime sur les autres modes", () => {
    expect(
      mode({
        ...baseEligible,
        "question 6 . ambulance . oxygene": "oui",
        "question 6 . vsl taxi . aide au deplacement": "oui",
        "question 6 . individuel commun . autonome": "oui",
      })
    ).toBe("ambulance");
  });
});
