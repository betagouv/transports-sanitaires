import { describe, it, expect } from "vitest";
import { baseEligible, evalRule } from "./helpers";

const statut = (s: Record<string, unknown>) => evalRule("resultat . statut", s);
const document = (s: Record<string, unknown>) =>
  evalRule("resultat . document", s);
const mode = (s: Record<string, unknown>) =>
  evalRule("resultat . mode transport", s);

describe("resultat . statut", () => {
  it("situation vide (aucun motif par défaut) → patient non éligible", () => {
    expect(statut({})).toBe("Patient non éligible");
    expect(document({})).toBe("Aucun document Assurance Maladie");
  });

  it("motif hospitalisation + mode individuel → patient éligible (PMT)", () => {
    const s = {
      ...baseEligible,
      "question 6 . individuel commun . autonome": "oui",
    };
    expect(statut(s)).toBe("Patient éligible");
    expect(document(s)).toBe("PMT — Prescription Médicale de Transport");
    expect(mode(s)).toBe("Véhicule personnel ou transport en commun");
  });

  it("trajet > 150 km → éligible sous réserve d'accord préalable (DAP)", () => {
    const s = {
      ...baseEligible,
      "question 6 . individuel commun . autonome": "oui",
      "question 5 . trajet plus de 150 km aller": "oui",
    };
    expect(statut(s)).toBe("Patient éligible sous réserve d’accord préalable");
    expect(document(s)).toBe("DAP — Demande d’Accord Préalable de Transport");
  });

  it("convocation contrôle sécurité sociale → convocation valant prescription", () => {
    const s = {
      "question 1 . situation particuliere": "'Aucune de ces situations'",
      "question 2 . patient hospitalise": "non",
      "question 3 . motif principal": "'Convocation ou contrôle de l’Assurance Maladie'",
    };
    expect(statut(s)).toBe("Patient éligible — convocation valant prescription");
    expect(document(s)).toBe("Convocation ou avis valant prescription");
  });

  it("SMUR → situation hors parcours Assurance Maladie standard", () => {
    const s = {
      "question 1 . situation particuliere": "'Transport SMUR'",
    };
    expect(statut(s)).toBe("Situation hors parcours Assurance Maladie standard");
    expect(document(s)).toBe("Procédure locale ou établissement");
  });

  it("patient hospitalisé sans exception → hors parcours", () => {
    const s = {
      "question 1 . situation particuliere": "'Aucune de ces situations'",
      "question 2 . patient hospitalise": "oui",
      "question 2_1 . exception assurance maladie": "'Aucune de ces exceptions'",
    };
    expect(statut(s)).toBe("Situation hors parcours Assurance Maladie standard");
  });

  it("contrainte bariatrique uniquement → patient non éligible", () => {
    const s = {
      "question 1 . situation particuliere": "'Transport bariatrique uniquement'",
    };
    expect(statut(s)).toBe("Patient non éligible");
    expect(document(s)).toBe("Aucun document Assurance Maladie");
  });

  it("aucun motif → patient non éligible", () => {
    const s = {
      "question 1 . situation particuliere": "'Aucune de ces situations'",
      "question 2 . patient hospitalise": "non",
      "question 3 . motif principal": "'Aucun de ces motifs'",
    };
    expect(statut(s)).toBe("Patient non éligible");
  });

  it("motif ouvrant droit mais aucun mode justifié → non éligible", () => {
    // hospitalisation mais aucune question 6 renseignée
    expect(statut(baseEligible)).toBe("Patient non éligible");
  });
});

describe("resultat . mode transport", () => {
  it("ambulance justifiée → ambulance", () => {
    expect(
      mode({ ...baseEligible, "question 6 . ambulance . oxygene": "oui" })
    ).toBe("Ambulance");
  });

  it("fauteuil roulant sans transfert → VSL/taxi TPMR", () => {
    expect(
      mode({
        ...baseEligible,
        "question 6 . tpmr . fauteuil roulant sans transfert": "oui",
      })
    ).toBe("VSL ou taxi conventionné TPMR");
  });

  it("aide au déplacement → VSL/taxi conventionné", () => {
    expect(
      mode({
        ...baseEligible,
        "question 6 . vsl taxi . aide au deplacement": "oui",
      })
    ).toBe("VSL ou taxi conventionné");
  });

  it("patient autonome → véhicule personnel / transport en commun", () => {
    expect(
      mode({
        ...baseEligible,
        "question 6 . individuel commun . autonome": "oui",
      })
    ).toBe("Véhicule personnel ou transport en commun");
  });

  it("ambulance prime sur les autres modes", () => {
    expect(
      mode({
        ...baseEligible,
        "question 6 . ambulance . oxygene": "oui",
        "question 6 . vsl taxi . aide au deplacement": "oui",
        "question 6 . individuel commun . autonome": "oui",
      })
    ).toBe("Ambulance");
  });
});
