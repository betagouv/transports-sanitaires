// La fin de P2, par les réponses seules, sans fait forcé : `fait_p2_complete`
// vaut « oui » quand toutes les pages de P2 qui se posent sont validées, et
// reste absent sinon (D-110). Chaque parcours va jusqu'à l'issue des règles.

import { describe, expect, it } from "vitest";
import {
  BRANCARD_20_KM,
  ciblesDe,
  ENTREE,
  faits,
  MATERNITE,
  p2Complete,
  posees,
} from "./reponses-de-la-branche";
import { PAR_Q21 } from "./reponses-de-la-convocation";
import { MINEUR, PATIENT_SEUL } from "./reponses-de-la-permission";

describe("fait_p2_complete", () => {
  it("vaut « oui » quand toutes les pages qui se posent sont validées", () => {
    expect(p2Complete(BRANCARD_20_KM)).toBe(true);
  });

  it("reste absent tant qu'une question attend, jamais « non »", () => {
    const sansTrajet = { ...BRANCARD_20_KM, "Q2.3.1": undefined };
    expect(faits(sansTrajet).fait_p2_complete).toEqual({
      provenance: expect.any(String),
    });
  });

  it("reste absent quand P1 n'est pas complète", () => {
    expect(
      p2Complete({ ...BRANCARD_20_KM, "Q1.2": undefined }),
    ).toBeUndefined();
  });
});

describe("de bout en bout, par les réponses", () => {
  it("brancard, aucune situation, 20 km : ISSUE_PMT", () => {
    const cibles = ciblesDe(BRANCARD_20_KM);
    expect(posees(BRANCARD_20_KM)).toEqual([]);
    expect(cibles.cible_issue_id).toBe("ISSUE_PMT");
    expect(cibles.cible_reason_code).toBe("MOTIF_QUALIFIE");
  });

  it("permission d'un adulte à sa charge : ISSUE_PERMISSION_PATIENT", () => {
    const reponses = {
      ...PATIENT_SEUL,
      "Q2.7": "4_ADULTE_A_SA_CHARGE",
      "Q2.7.a": "1_OUI",
    } as const;
    expect(ciblesDe(reponses).cible_issue_id).toBe("ISSUE_PERMISSION_PATIENT");
  });

  it("permission d'un mineur admissible : ISSUE_S3141", () => {
    expect(ciblesDe(MINEUR).cible_issue_id).toBe("ISSUE_S3141");
  });

  it("convocation au contrôle médical (Q2.10 = 1) : ISSUE_CONVOCATION", () => {
    const reponses = { ...PAR_Q21, "Q2.10": "1_CONTROLE_MEDICAL" } as const;
    expect(ciblesDe(reponses).cible_issue_id).toBe("ISSUE_CONVOCATION");
  });

  it("maternité éloignée établie, urgence non attestée : demande d'accord préalable", () => {
    const reponses = {
      ...MATERNITE,
      "Q2.14.1": "1_OUI",
      "Q2.12": "2_NON",
    } as const;
    expect(ciblesDe(reponses).cible_issue_id).toBe("ISSUE_DAP_SANS_URGENCE");
  });

  it("entrée depuis le domicile (Q2.13) : plus de renvoi à la caisse", () => {
    const reponses = { ...ENTREE, "Q2.13.depart": "1_DOMICILE" } as const;
    expect(ciblesDe(reponses).cible_issue_id).toBe("ISSUE_PMT");
  });

  // `negation_precise_v1002` : Q1.3 sans séance et Q2.1 hors hospitalisation
  // écartent la séance qualifiante ; « déjà hospitalisé » écarté en Q2.2.1
  // écarte l'hospitalisation (D41 et D42 de l'oracle).
  it("consultation ordinaire sans autre motif : ISSUE_NON_ELIGIBLE", () => {
    const reponses = { ...PATIENT_SEUL, "Q2.1": "1_CONSULTATION" } as const;
    expect(p2Complete(reponses)).toBe(true);
    expect(ciblesDe(reponses).cible_issue_id).toBe("ISSUE_NON_ELIGIBLE");
  });
});
