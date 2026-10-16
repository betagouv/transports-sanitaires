// L'oracle de l'éditeur, rejoué contre les règles : les cas D01 à D49, puis
// les frontières et les faits inconnus que son test du moteur vérifie
// (`tests/test_publicode_v1002.mjs` du paquet v10.1.1).
//
// Les cas sont écrits en faits, comme l'éditeur les livre
// (`faits-de-l-oracle.ts`). Les identifiants sont ceux de l'éditeur : un
// désaccord remonte sous ce nom.

import { describe, expect, it } from "vitest";
import type { Cibles } from "../../../front/models/eligibilite/declarations/cibles";
import { cibles } from "../../../front/models/eligibilite/evaluation-des-regles";
import {
  ABSENTS,
  ALD,
  ALD_NON_EXONERANTE,
  BRANCARD,
  type Changements,
  CONVOCATION,
  faitsDe,
  HOSPITALISATION,
  type Issue,
  LONGUE_DISTANCE,
  MATERNITE,
  preconiser,
  SERIE,
  TRANSFERT,
  URGENCE,
} from "./faits-de-l-oracle";

const CAS: readonly [id: string, faits: Changements, issue: Issue][] = [
  ["D01", BRANCARD, "ISSUE_PMT"],
  ["D02", { ...BRANCARD, fait_correspondance_univoque: false }, "ISSUE_PMT"],
  ["D03", { ...BRANCARD, fait_exclusion_soin_prouvee: true }, "ISSUE_PMT"],
  ["D04", ALD, "ISSUE_PMT"],
  ["D05", ALD_NON_EXONERANTE, "ISSUE_NON_ELIGIBLE"],
  ["D06", { ...ALD, fait_ald_exonerante_3_ou_4: undefined }, "ISSUE_CAISSE"],
  ["D07", { ...SERIE, fait_ald_liee: true }, "ISSUE_DAP_SANS_URGENCE"],
  ["D08", SERIE, "ISSUE_DAP_SANS_URGENCE"],
  ["D09", { ...SERIE, ...URGENCE }, "ISSUE_DAP_URGENCE_ATTESTEE"],
  ["D10", { ...SERIE, fait_serie_qualifiante: false }, "ISSUE_NON_ELIGIBLE"],
  ["D11", { ...SERIE, fait_distance_plus_50: false }, "ISSUE_NON_ELIGIBLE"],
  ["D12", LONGUE_DISTANCE, "ISSUE_DAP_SANS_URGENCE"],
  ["D13", { ...LONGUE_DISTANCE, ...URGENCE }, "ISSUE_DAP_URGENCE_ATTESTEE"],
  ["D14", TRANSFERT, "ISSUE_ETABLISSEMENT"],
  [
    "D15",
    { ...TRANSFERT, fait_centre15_interetablissements: true },
    "ISSUE_CAISSE",
  ],
  [
    "D16",
    { ...TRANSFERT, fait_centre15_interetablissements: true, ...URGENCE },
    "ISSUE_CAISSE",
  ],
  ["D17", { fait_htnm_hors_maternite: true }, "ISSUE_CAISSE"],
  ["D18", { ...BRANCARD, fait_htnm_hors_maternite: true }, "ISSUE_CAISSE"],
  ["D19", MATERNITE, "ISSUE_DAP_SANS_URGENCE"],
  ["D20", { ...MATERNITE, ...URGENCE }, "ISSUE_CAISSE"],
  [
    "D21",
    { ...ALD_NON_EXONERANTE, fait_mineur_soins_prolonges_reconnus: true },
    "ISSUE_PMT",
  ],
  [
    "D22",
    { ...ALD_NON_EXONERANTE, fait_mineur_soins_prolonges_reconnus: undefined },
    "ISSUE_CAISSE",
  ],
  ["D23", ALD_NON_EXONERANTE, "ISSUE_NON_ELIGIBLE"],
  ["D24", CONVOCATION, "ISSUE_CONVOCATION"],
  ["D25", BRANCARD, "ISSUE_PMT"],
  ["D26", { ...BRANCARD, fait_bariatrique: true }, "ISSUE_PMT"],
  [
    "D27",
    { ...BRANCARD, fait_trajet_etranger: true },
    "ISSUE_DAP_ETRANGER_A_EXAMINER",
  ],
  [
    "D28",
    { ...LONGUE_DISTANCE, fait_trajet_etranger: true },
    "ISSUE_DAP_ETRANGER_A_EXAMINER",
  ],
  [
    "D29",
    {
      ...BRANCARD,
      fait_trajet_etranger: true,
      fait_exclusion_transport_prouvee: true,
    },
    "ISSUE_NON_ELIGIBLE",
  ],
  ["D30", CONVOCATION, "ISSUE_CONVOCATION"],
  ["D31", BRANCARD, "ISSUE_PMT"],
  [
    "D32",
    { ...BRANCARD, fait_correspondance_univoque: false, ...CONVOCATION },
    "ISSUE_CONVOCATION",
  ],
  ["D33", HOSPITALISATION, "ISSUE_PMT"],
  ["D34", HOSPITALISATION, "ISSUE_PMT"],
  [
    "D35",
    { ...LONGUE_DISTANCE, fait_atmp_lie: true },
    "ISSUE_DAP_SANS_URGENCE",
  ],
  ["D36", { ...SERIE, fait_atmp_lie: true }, "ISSUE_DAP_SANS_URGENCE"],
  [
    "D37",
    { ...LONGUE_DISTANCE, fait_atmp_lie: true, ...URGENCE },
    "ISSUE_DAP_URGENCE_ATTESTEE",
  ],
  ["D38", HOSPITALISATION, "ISSUE_PMT"],
  ["D39", HOSPITALISATION, "ISSUE_PMT"],
  ["D40", HOSPITALISATION, "ISSUE_PMT"],
  ["D41", {}, "ISSUE_NON_ELIGIBLE"],
  ["D42", {}, "ISSUE_NON_ELIGIBLE"],
  [
    "D43",
    { ...HOSPITALISATION, fait_exclusion_transport_prouvee: true },
    "ISSUE_NON_ELIGIBLE",
  ],
  ["D44", HOSPITALISATION, "ISSUE_PMT"],
  ["D45", TRANSFERT, "ISSUE_ETABLISSEMENT"],
  [
    "D46",
    { fait_convocation: false, fait_evenement_sans_soin: false },
    "ISSUE_NON_ELIGIBLE",
  ],
  [
    "D47",
    { ...BRANCARD, fait_exclusion_transport_prouvee: true },
    "ISSUE_NON_ELIGIBLE",
  ],
  ["D48", { ...BRANCARD, fait_motif_samsah: true }, "ISSUE_CAISSE"],
  ["D49", { ...BRANCARD, fait_motif_pension: true }, "ISSUE_CAISSE"],
];

// Le document de chaque issue. Les autres issues n'en ont pas.
const SUPPORTS: Partial<Record<Issue, Cibles["cible_support_id"]>> = {
  ISSUE_PMT: "S3138g",
  ISSUE_DAP_SANS_URGENCE: "S3139h",
  ISSUE_DAP_URGENCE_ATTESTEE: "S3139h",
  ISSUE_DAP_ETRANGER_A_EXAMINER: "S3139h",
  ISSUE_S3141: "S3141",
};

describe("l'oracle de l'éditeur", () => {
  it.each(CAS)("%s", (_id, faits, issue) => {
    const rendu = preconiser(faits);
    expect(rendu.cible_issue_id).toBe(issue);
    expect(rendu.cible_support_id).toBe(SUPPORTS[issue] ?? "AUCUN");
    expect(rendu.cible_reason_code).toBeTruthy();
  });

  it.each([
    ["D22", "MINEUR_RECONNAISSANCE_NON_VERIFIABLE"],
    ["D46", "AUCUN_MOTIF_TRANSPORT"],
  ] as const)("%s donne sa raison", (id, raison) => {
    const [, faits] = CAS.find(([cas]) => cas === id) ?? [];
    expect(preconiser(faits ?? {}).cible_reason_code).toBe(raison);
  });
});

describe("les frontières", () => {
  it("une ALD inconnue n'empêche pas l'ambulance", () => {
    expect(
      preconiser({
        ...BRANCARD,
        fait_ald_liee: true,
        fait_ald_exonerante_3_ou_4: undefined,
      }).cible_issue_id,
    ).toBe("ISSUE_PMT");
  });

  it("une ALD inconnue renvoie une série vers la caisse", () => {
    expect(
      preconiser({
        ...BRANCARD,
        ...SERIE,
        fait_ald_liee: true,
        fait_ald_exonerante_3_ou_4: undefined,
      }).cible_issue_id,
    ).toBe("ISSUE_CAISSE");
  });

  it("le CAMSP donne une DAP sans fait propre", () => {
    expect(
      preconiser({ fait_motif_camsp: true, fait_urgence_repondue: true })
        .cible_issue_id,
    ).toBe("ISSUE_DAP_SANS_URGENCE");
  });

  it("un CAMSP écarté ne retient pas l'ambulance", () => {
    expect(
      preconiser({ ...BRANCARD, fait_ald_liee: true, fait_motif_camsp: false })
        .cible_issue_id,
    ).toBe("ISSUE_PMT");
  });
});

describe("les faits inconnus", () => {
  it("une convocation invérifiable renvoie vers la caisse, motivée", () => {
    const rendu = preconiser({ fait_convocation: undefined });
    expect(rendu.cible_issue_id).toBe("ISSUE_CAISSE");
    expect(rendu.cible_reason_code).toBe(
      "CONVOCATION_CONDITION_NON_VERIFIABLE",
    );
  });

  it("une convocation écartée n'est pas une convocation inconnue", () => {
    expect(preconiser({ fait_convocation: false }).cible_issue_id).toBe(
      "ISSUE_NON_ELIGIBLE",
    );
  });

  it("une convocation inconnue et décisive l'emporte sur l'ambulance", () => {
    expect(
      preconiser({ ...BRANCARD, fait_convocation: undefined }).cible_issue_id,
    ).toBe("ISSUE_CAISSE");
  });

  it("des faits presque tous absents ne donnent aucune issue", () => {
    const rendu = cibles(
      faitsDe({
        ...ABSENTS,
        fait_p1_complete: true,
        fait_p2_complete: true,
        ...BRANCARD,
        fait_ald_liee: true,
      }),
    );
    expect(rendu.cible_issue_id).toBeUndefined();
  });
});
