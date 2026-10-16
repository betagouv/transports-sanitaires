// La page de branche (Q2.12 à Q2.14) : quand chaque question se pose, ce
// qu'elle établit, et l'issue qui en résulte. `CATALOGUE_COMPLET_QUESTIONS.md`
// Q2.12, Q2.13 et Q2.14, `CONTRAT_REPONSES_FAITS.json` et
// `CONTRAT_NEGATIONS_PROUVEES.json` du paquet de l'éditeur (D-110).

import { describe, expect, it } from "vitest";
import {
  ciblesDe,
  ENTREE,
  faits,
  HTNM,
  incoherences,
  MATERNITE,
  MATERNITE_PAR_Q221B,
  p2Complete,
  posees,
} from "./reponses-de-la-branche";
import { PATIENT_SEUL } from "./reponses-de-la-permission";

describe("Q2.14.1, le dispositif Engagement maternité", () => {
  it("se pose quand Q2.1 dit la maternité éloignée", () => {
    expect(posees(MATERNITE)).toEqual(["Q2.14.1"]);
  });

  it("se pose quand Q2.2.1.b signale la maternité éloignée", () => {
    expect(posees(MATERNITE_PAR_Q221B)).toEqual(["Q2.14.1"]);
  });

  it("ne se pose pas sans maternité", () => {
    expect(posees(PATIENT_SEUL)).toEqual([]);
  });

  it("ne se pose pas quand une orientation prioritaire est établie", () => {
    const permissionAChargeDuPatient = {
      ...MATERNITE_PAR_Q221B,
      "Q2.1": "11_PERMISSION",
      "Q2.7": "4_ADULTE_A_SA_CHARGE",
      "Q2.7.a": "1_OUI",
    } as const;
    expect(posees(permissionAChargeDuPatient)).toEqual([]);
  });

  // Constat, à remonter : la maternité signalée reste « à qualifier », donc
  // `cible_dap_requise` reste indéfinie et la décision n'est pas calculable,
  // alors que la permission à charge du patient suffirait à l'issue.
  it("laisse alors la décision sans issue, faute de fait_dap_maternite", () => {
    const permissionAChargeDuPatient = {
      ...MATERNITE_PAR_Q221B,
      "Q2.1": "11_PERMISSION",
      "Q2.7": "4_ADULTE_A_SA_CHARGE",
      "Q2.7.a": "1_OUI",
    } as const;
    expect(p2Complete(permissionAChargeDuPatient)).toBe(true);
    expect(ciblesDe(permissionAChargeDuPatient).cible_issue_id).toBeUndefined();
  });

  it("attend sa réponse : sans elle, P2 n'est pas complète et aucune issue ne vaut", () => {
    expect(faits(MATERNITE).fait_dap_maternite.value).toBeUndefined();
    expect(p2Complete(MATERNITE)).toBeUndefined();
    expect(ciblesDe(MATERNITE).cible_issue_id).toBeUndefined();
  });
});

describe("Q2.14.1 = Oui, le dispositif est établi", () => {
  const etabli = { ...MATERNITE, "Q2.14.1": "1_OUI" } as const;

  it("établit la maternité et le rattachement à l'Engagement", () => {
    expect(faits(etabli).fait_dap_maternite.value).toBe(true);
    expect(faits(etabli).fait_htnm_hors_maternite.value).toBe(false);
  });

  it("dévoile l'urgence (Q2.12), que la page du trajet avait masquée", () => {
    expect(posees(MATERNITE)).not.toContain("Q2.12");
    expect(posees(etabli)).toEqual(["Q2.14.1", "Q2.12"]);
  });

  it("sans l'urgence, la décision n'est pas calculable", () => {
    expect(p2Complete(etabli)).toBeUndefined();
    expect(ciblesDe(etabli).cible_issue_id).toBeUndefined();
  });

  it("urgence non attestée (Q2.12) : demande d'accord préalable sans urgence", () => {
    const reponses = { ...etabli, "Q2.12": "2_NON" } as const;
    expect(ciblesDe(reponses).cible_issue_id).toBe("ISSUE_DAP_SANS_URGENCE");
    expect(p2Complete(reponses)).toBe(true);
  });

  it("urgence attestée (Q2.12) : point à la caisse, Engagement maternité", () => {
    const reponses = { ...etabli, "Q2.12": "1_OUI" } as const;
    const cibles = ciblesDe(reponses);
    expect(cibles.cible_issue_id).toBe("ISSUE_CAISSE");
    expect(cibles.cible_reason_code).toBe("CNAM_ENGAGEMENT_MATERNITE_URGENCE");
  });

  it("ne repose pas l'urgence que le trajet a déjà posée", () => {
    const longue = {
      ...etabli,
      "Q2.3.1": "3_PLUS_DE_CENT_CINQUANTE_KM",
      "Q2.3.3": "2_NON",
      "Q2.3.4": "2_NON",
    } as const;
    expect(posees(longue)).toEqual(["Q2.14.1"]);
    expect(ciblesDe(longue).cible_issue_id).toBe("ISSUE_DAP_SANS_URGENCE");
  });

  it("change Q2.14.1 : la réponse de Q2.12 est effacée", () => {
    const reponses = { ...etabli, "Q2.12": "2_NON" } as const;
    expect(posees({ ...reponses, "Q2.14.1": "2_NON" })).not.toContain("Q2.12");
  });
});

describe("Q2.14.1 = Non, le dispositif n'est pas établi", () => {
  it("écarte la maternité signalée en Q2.2.1.b, sans autre motif", () => {
    const reponses = { ...MATERNITE_PAR_Q221B, "Q2.14.1": "2_NON" } as const;
    expect(faits(reponses).fait_dap_maternite.value).toBe(false);
    expect(posees(reponses)).toEqual(["Q2.14.1"]);
    expect(p2Complete(reponses)).toBe(true);
  });

  it("demande de corriger le motif quand Q2.1 dit la maternité", () => {
    const reponses = { ...MATERNITE, "Q2.14.1": "2_NON" } as const;
    expect(incoherences("Q2.14.1", reponses)).toEqual([
      expect.stringContaining("Corrigez le motif en Q2.1"),
    ]);
    expect(p2Complete(reponses)).toBeUndefined();
    expect(ciblesDe(reponses).cible_issue_id).toBeUndefined();
  });
});

describe("Q2.14.2, le rattachement d'un HTNM", () => {
  it("se pose quand Q2.2.1.b déclare un HTNM, jamais avec « Non »", () => {
    expect(posees(HTNM)).toEqual(["Q2.14.2"]);
  });

  it("hors de l'Engagement : point à la caisse, sans question de plus", () => {
    const reponses = { ...HTNM, "Q2.14.2": "2_HORS_ENGAGEMENT" } as const;
    const cibles = ciblesDe(reponses);
    expect(faits(reponses).fait_htnm_hors_maternite.value).toBe(true);
    expect(posees(reponses)).toEqual(["Q2.14.2"]);
    expect(cibles.cible_issue_id).toBe("ISSUE_CAISSE");
    expect(cibles.cible_reason_code).toBe("CNAM_HTNM_HORS_MATERNITE");
  });

  it("dans l'Engagement : demande si le dispositif est établi", () => {
    const reponses = { ...HTNM, "Q2.14.2": "1_DANS_L_ENGAGEMENT" } as const;
    expect(posees(reponses)).toEqual(["Q2.14.2", "Q2.14.1"]);
    expect(faits(reponses).fait_htnm_hors_maternite.value).toBe(false);
  });

  it("dans l'Engagement avec un dispositif établi : maternité et DAP", () => {
    const reponses = {
      ...HTNM,
      "Q2.14.2": "1_DANS_L_ENGAGEMENT",
      "Q2.14.1": "1_OUI",
      "Q2.12": "2_NON",
    } as const;
    expect(faits(reponses).fait_dap_maternite.value).toBe(true);
    expect(ciblesDe(reponses).cible_issue_id).toBe("ISSUE_DAP_SANS_URGENCE");
  });

  it("dans l'Engagement avec un dispositif refusé : incohérent, à corriger", () => {
    const reponses = {
      ...HTNM,
      "Q2.14.2": "1_DANS_L_ENGAGEMENT",
      "Q2.14.1": "2_NON",
    } as const;
    expect(incoherences("Q2.14.1", reponses)).toEqual([
      expect.stringContaining("suppose que le dispositif soit établi"),
    ]);
    expect(p2Complete(reponses)).toBeUndefined();
  });
});

describe("Q2.13, le départ d'une entrée en établissement", () => {
  it("se pose pour une entrée dont le transfert reste à qualifier", () => {
    expect(posees(ENTREE)).toEqual(["Q2.13.depart"]);
    expect(ciblesDe(ENTREE).cible_issue_id).toBeUndefined();
  });

  it("ne se pose pas pour une sortie, déjà qualifiée", () => {
    const sortie = { ...ENTREE, "Q2.1.g": "2_SORTIE" } as const;
    expect(posees(sortie)).toEqual([]);
  });

  it.each([
    "1_DOMICILE",
    "5_HEBERGEMENT_NON_MEDICALISE",
    "6_ETABLISSEMENT_PENITENTIAIRE",
  ] as const)(
    "départ « %s » : entrée simple, hors de l'article 80",
    (depart) => {
      const reponses = { ...ENTREE, "Q2.13.depart": depart };
      expect(faits(reponses).fait_transfert_article80.value).toBe(false);
      expect(p2Complete(reponses)).toBe(true);
      expect(faits(reponses).fait_centre15_interetablissements.value).toBe(
        false,
      );
      expect(ciblesDe(reponses).cible_issue_id).toBe("ISSUE_PMT");
    },
  );

  it.each([
    "2_ETABLISSEMENT_DE_SANTE",
    "3_EHPAD",
    "4_USLD",
    "7_AUTRE_LIEU",
  ] as const)(
    "départ « %s » : le transfert reste à qualifier, la caisse tranche",
    (depart) => {
      const reponses = { ...ENTREE, "Q2.13.depart": depart };
      const cibles = ciblesDe(reponses);
      expect(faits(reponses).fait_transfert_article80.value).toBeUndefined();
      expect(cibles.cible_issue_id).toBe("ISSUE_CAISSE");
      expect(cibles.cible_reason_code).toBe("AUTRE_DROIT_NON_VERIFIABLE");
    },
  );
});

describe("la page de branche", () => {
  it("n'est pas posée sur un trajet ordinaire", () => {
    expect(posees(PATIENT_SEUL)).toEqual([]);
  });
});
