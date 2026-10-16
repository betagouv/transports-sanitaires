// La raison de la fiche patient négative (#134). Chaque raison du catalogue se
// choisit sur la trace qui prouve sa condition, mot pour mot ; un fait absent
// n'est jamais « non ».

import { describe, expect, it } from "vitest";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import type { Faits } from "../../../front/models/eligibilite/declarations/faits";
import type { Precisions } from "../../../front/models/eligibilite/precisions-du-resultat";
import { raisonNonEligible } from "../../../front/models/eligibilite/raison-non-eligible";
import { SEEDS } from "../../../front/models/eligibilite/seeds-catalogue";
import { traceDuResultat } from "../../../front/models/eligibilite/trace-du-resultat";
import { ciblesDe } from "./reponses-de-la-permission";
import { faux, trace, vrai } from "./traces-du-praticien";

const { issues } = await catalogueResultats();
const issue = issues.ISSUE_NON_ELIGIBLE;

const AUCUN_MOTIF = {
  cible_issue_id: "ISSUE_NON_ELIGIBLE",
  cible_reason_code: "AUCUN_MOTIF_TRANSPORT",
} as const;

const raisonDe = (precisions: Precisions, faits: Partial<Faits> = {}) =>
  raisonNonEligible(issue, trace(AUCUN_MOTIF, faits, precisions)).id;

const ALD = { aldRecognized: true, aldRelated: true } as const;

// Chaque raison active, et la trace qui prouve sa condition.
const PREUVES: readonly [string, Precisions, Partial<Faits>][] = [
  [
    "AUCUN_ALD_SANS_LIEN",
    { aldRecognized: true, aldRelated: false },
    { fait_ald_liee: faux },
  ],
  ["AUCUN_ALD_SANS_DEFICIENCE", ALD, { fait_ald_liee: faux }],
  [
    "AUCUN_ALD_CADRE_NON_QUALIFIANT",
    ALD,
    {
      fait_ald_liee: vrai,
      fait_ald_exonerante_3_ou_4: faux,
      fait_mineur_soins_prolonges_reconnus: faux,
    },
  ],
  ["AUCUN_DIALYSE_NON_HEMO", { dialysisType: "non-hemodialyse" }, {}],
  ["AUCUN_DIALYSE_TYPE_INCONNU", { dialysisType: "inconnu" }, {}],
  [
    "AUCUN_APPAREILLAGE_HORS_CATEGORIES",
    { deviceCategory: "hors-categories" },
    {},
  ],
  [
    "AUCUN_SERIE_NON_QUALIFIANTE",
    { repeatedTripsPlanned: true },
    { fait_serie_qualifiante: faux },
  ],
  ["AUCUN_CONSULTATION", { careFamily: 1 }, {}],
  ["AUCUN_SOINS_DENTAIRES_SAGE_FEMME", { careFamily: 2 }, {}],
  ["AUCUN_IMAGERIE", { careFamily: 3 }, {}],
  ["AUCUN_BIOLOGIE", { careFamily: 4 }, {}],
  ["AUCUN_PARAMEDICAL", { careFamily: 5 }, {}],
  ["AUCUN_PSYCHOLOGUE", { careFamily: 7 }, {}],
  ["AUCUN_AUTRE_SOIN", { careFamily: 14 }, {}],
  [
    "AUCUN_AUTRE_DEPLACEMENT",
    { careFamily: 15, eventFinalityClarified: true },
    {},
  ],
];

describe("la raison que la trace prouve", () => {
  it.each(PREUVES)("%s", (id, precisions, faits) => {
    expect(raisonDe(precisions, faits)).toBe(id);
  });

  it("couvre toutes les raisons actives de AUCUN_MOTIF_TRANSPORT, repli excepté", () => {
    const actives = issue.reasons
      .filter(
        ({ inactive, reason }) =>
          !inactive && reason === "AUCUN_MOTIF_TRANSPORT",
      )
      .map(({ id }) => id)
      .filter((id) => id !== "AUCUN_GENERIQUE");
    expect(PREUVES.map(([id]) => id).sort()).toEqual(actives.sort());
  });

  it("prend l'exclusion du transport quand la règle datée est conservée", () => {
    const exclusion = trace(
      {
        cible_issue_id: "ISSUE_NON_ELIGIBLE",
        cible_reason_code: "TRANSPORT_EXCLU_PROUVE",
      },
      { fait_exclusion_transport_prouvee: vrai },
      {
        careFamily: 1,
        transportExclusionRule: {
          reference: "R. 322-10",
          version: "2026-01-01",
          conditionsVerified: true,
        },
      },
    );
    expect(raisonNonEligible(issue, exclusion).id).toBe("TRANSPORT_EXCLU");
  });
});

describe("la priorité", () => {
  it("la plus haute l'emporte : l'ALD sur la dialyse, la dialyse sur la consultation", () => {
    const dialyse = { dialysisType: "non-hemodialyse", careFamily: 1 } as const;
    expect(raisonDe({ ...dialyse, ...ALD }, { fait_ald_liee: faux })).toBe(
      "AUCUN_ALD_SANS_DEFICIENCE",
    );
    expect(raisonDe(dialyse)).toBe("AUCUN_DIALYSE_NON_HEMO");
  });
});

describe("le repli AUCUN_GENERIQUE", () => {
  it.each([
    ["aucune précision", {}, {}],
    ["un soin sans phrase de famille", { careFamily: 6 }, {}],
    [
      "l'autre déplacement dont la finalité n'est pas clarifiée",
      { careFamily: 15 },
      {},
    ],
  ] as const)(
    "quand la trace ne prouve rien de plus : %s",
    (_nom, precisions, faits) => {
      expect(raisonDe(precisions, faits)).toBe("AUCUN_GENERIQUE");
    },
  );

  it("n'est jamais pris quand une raison est prouvée", () => {
    expect(raisonDe({ careFamily: 1 })).not.toBe("AUCUN_GENERIQUE");
  });
});

describe("un fait absent n'est jamais « non »", () => {
  it("une ALD dont le lien n'est pas établi ne dit pas qu'il manque de déficience", () => {
    expect(raisonDe(ALD, {})).toBe("AUCUN_GENERIQUE");
  });

  it("des transports répétés sans réponse sur la série ne la disent pas non qualifiante", () => {
    expect(raisonDe({ repeatedTripsPlanned: true })).toBe("AUCUN_GENERIQUE");
  });

  it("un fondement d'ALD inconnu ne dit pas que le cadre n'est pas qualifiant", () => {
    const inconnu = { fait_ald_liee: vrai, fait_ald_exonerante_3_ou_4: {} };
    expect(raisonDe(ALD, inconnu as Partial<Faits>)).toBe("AUCUN_GENERIQUE");
  });

  it("« Je ne peux pas préciser » n'est pas « Non »", () => {
    expect(raisonDe({ dialysisType: "inconnu" })).toBe(
      "AUCUN_DIALYSE_TYPE_INCONNU",
    );
    expect(raisonDe({ dialysisType: "non-hemodialyse" })).toBe(
      "AUCUN_DIALYSE_NON_HEMO",
    );
  });

  it("un séjour prouvé écarte les raisons de la dialyse", () => {
    expect(
      raisonDe({
        dialysisType: "non-hemodialyse",
        hospitalisation: "H-SEJOUR",
      }),
    ).toBe("AUCUN_GENERIQUE");
  });
});

describe("les raisons qui ne sont pas de cette trace", () => {
  it("n'en prend aucune hors d'une non-éligibilité", () => {
    const ailleurs = trace(
      { cible_issue_id: "ISSUE_PMT", cible_reason_code: "MOTIF_QUALIFIE" },
      {},
      { careFamily: 1 },
    );
    expect(raisonNonEligible(issue, ailleurs).id).toBe("AUCUN_GENERIQUE");
  });

  it("ne prend jamais une raison inactive", () => {
    const inactive = trace(
      {
        cible_issue_id: "ISSUE_NON_ELIGIBLE",
        cible_reason_code: "SOIN_NON_COUVERT_PROUVE",
      },
      {},
      { careFamily: 1 },
    );
    expect(raisonNonEligible(issue, inactive).id).toBe("AUCUN_GENERIQUE");
  });

  it("lit le code de raison que les règles donnent, quand il est là", () => {
    const autre = trace(
      { ...AUCUN_MOTIF, cible_reason_code: "SOINS_NON_VERIFIABLES" },
      {},
      { careFamily: 1 },
    );
    expect(raisonNonEligible(issue, autre).id).toBe("AUCUN_GENERIQUE");
  });
});

// Avec nos réponses, `cible_reason_code` reste indéfini sur cette issue : la
// raison se lit sur `cible_motif_transport` (voir `raison-non-eligible.ts`).
describe("de bout en bout, par les réponses", () => {
  const seed = SEEDS.find(({ id }) => id === "issue-non-eligible");
  if (!seed) throw new Error("Seed inconnue : issue-non-eligible");
  const raisonDesReponses = (plus: object) => {
    const answers = { ...seed.answers, ...plus } as typeof seed.answers;
    const cibles = ciblesDe(answers);
    return {
      issue: cibles.cible_issue_id,
      raison: raisonNonEligible(issue, traceDuResultat(answers, cibles)).id,
    };
  };

  it.each([
    ["la seed : une consultation", {}, "AUCUN_CONSULTATION"],
    [
      "un dentiste",
      { "Q2.1": "2_DENTISTE_OU_SAGE_FEMME" },
      "AUCUN_SOINS_DENTAIRES_SAGE_FEMME",
    ],
    ["une imagerie", { "Q2.1": "3_IMAGERIE" }, "AUCUN_IMAGERIE"],
    ["une biologie", { "Q2.1": "4_BIOLOGIE" }, "AUCUN_BIOLOGIE"],
    ["un soin paramédical", { "Q2.1": "5_PARAMEDICAL" }, "AUCUN_PARAMEDICAL"],
    ["un psychologue", { "Q2.1": "7_PSYCHOLOGUE" }, "AUCUN_PSYCHOLOGUE"],
    ["un autre soin", { "Q2.1": "14_AUTRE" }, "AUCUN_AUTRE_SOIN"],
    [
      "aucun de ces soins (Q2.1 option 15), dont la finalité n'est pas clarifiée",
      { "Q2.1": "15_AUCUN" },
      "AUCUN_GENERIQUE",
    ],
    [
      "un appareillage hors des catégories (Q2.10.b)",
      {
        "Q2.1": "12_CONVOCATION",
        "Q2.10": "6_APPAREILLAGE",
        "Q2.10.a": "1_OUI",
        "Q2.10.b": "4_AUTRE",
      },
      "AUCUN_APPAREILLAGE_HORS_CATEGORIES",
    ],
    [
      "une autre dialyse que l'hémodialyse (Q1.3.a Non)",
      { "Q1.3": ["5_DIALYSE"], "Q1.3.a": "2_AUTRE_DIALYSE" },
      "AUCUN_DIALYSE_NON_HEMO",
    ],
    [
      "une dialyse dont le type n'est pas précisé (Q1.3.a)",
      { "Q1.3": ["5_DIALYSE"], "Q1.3.a": "3_NE_SAIT_PAS" },
      "AUCUN_DIALYSE_TYPE_INCONNU",
    ],
    [
      "une ALD, le patient se déplaçant seul (Q1.1)",
      {
        "Q1.1": "1_SEUL",
        "Q1.4": "1_VEHICULE_PERSONNEL",
        "Q1.3": ["2_ALD"],
      },
      "AUCUN_ALD_SANS_DEFICIENCE",
    ],
  ])("%s", (_nom, plus, raison) => {
    expect(raisonDesReponses(plus)).toEqual({
      issue: "ISSUE_NON_ELIGIBLE",
      raison,
    });
  });
});
