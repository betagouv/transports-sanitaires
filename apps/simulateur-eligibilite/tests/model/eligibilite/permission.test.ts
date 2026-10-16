// La permission (Q2.7) : quand les pages se posent, ce qu'elles établissent, et
// l'issue qu'elles donnent. `CONTRAT_REPONSES_FAITS.json`, `CONTRAT_SAISIES_ET_PAGES.md`
// et `TSREF-20261015-05` du paquet de l'éditeur (D-107).

import { describe, expect, it } from "vitest";
import type { Faits } from "../../../front/models/eligibilite/declarations/faits";
import {
  ciblesDe,
  faits,
  issue,
  MINEUR,
  PATIENT_SEUL,
  posee,
  type Reponses,
} from "./reponses-de-la-permission";
import { SEJOUR } from "./reponses-du-transfert";

const DEUX_FAITS = [
  "fait_permission_charge_patient",
  "fait_permission_mineur_admissible",
] as const;
const deux = (reponses: Reponses) =>
  DEUX_FAITS.map((nom) => faits(reponses)[nom].value);
const unFait = (reponses: Reponses, nom: keyof Faits) => faits(reponses)[nom];

const ADULTE_A_SA_CHARGE: Reponses = {
  ...PATIENT_SEUL,
  "Q2.7": "4_ADULTE_A_SA_CHARGE",
  "Q2.7.a": "1_OUI",
};

describe("quand Q2.7 se pose", () => {
  it("pose Q2.7, et aucune des pages du transfert, après une permission de Q2.1", () => {
    expect(posee("P2/permission", "Q2.7", PATIENT_SEUL)).toBeDefined();
    expect(posee("P2/transfert", "Q2.5", PATIENT_SEUL)).toBeUndefined();
    expect(posee("P2/exceptions", "Q2.6", PATIENT_SEUL)).toBeUndefined();
  });

  it("pose Q2.7 après une permission de Q2.2.1.a", () => {
    const reponses: Reponses = {
      ...PATIENT_SEUL,
      "Q2.1": "1_CONSULTATION",
      "Q2.2.1": ["1_HOSPITALISATION"],
      "Q2.2.1.a": "1_OUI",
    };
    expect(posee("P2/permission", "Q2.7", reponses)).toBeDefined();
  });

  it.each([
    ["un motif sans permission", { ...PATIENT_SEUL, "Q2.1": "1_CONSULTATION" }],
    [
      "une permission écartée en Q2.2.1.a",
      {
        ...PATIENT_SEUL,
        "Q2.1": "1_CONSULTATION",
        "Q2.2.1": ["1_HOSPITALISATION"],
        "Q2.2.1.a": "2_NON",
      },
    ],
  ] as const)("ne pose pas Q2.7 sur %s", (_, reponses) => {
    expect(posee("P2/permission", "Q2.7", reponses)).toBeUndefined();
  });

  it("pose Q2.7.a seulement pour un adulte à sa charge", () => {
    expect(posee("P2/permission", "Q2.7.a", ADULTE_A_SA_CHARGE)).toBeDefined();
    expect(posee("P2/permission", "Q2.7.a", PATIENT_SEUL)).toBeUndefined();
    expect(
      posee("P2/permission", "Q2.7.a", {
        ...PATIENT_SEUL,
        "Q2.7": "3_ADULTE_AUTORISEE",
      }),
    ).toBeUndefined();
  });

  it("donne l'aide du catalogue à Q2.7.a", () => {
    expect(posee("P2/permission", "Q2.7.a", ADULTE_A_SA_CHARGE)?.hint).toMatch(
      /^La seule préférence personnelle ne suffit pas\./,
    );
  });

  it.each([
    ["1_MOINS_DE_SEIZE_ANS", true],
    ["2_SEIZE_A_DIX_NEUF_ANS", true],
    ["3_ADULTE_AUTORISEE", false],
    ["4_ADULTE_A_SA_CHARGE", false],
  ] as const)(
    "Q2.7 = %s : la page du mineur se pose-t-elle ? %s",
    (tranche, posee_) => {
      const reponses = { ...PATIENT_SEUL, "Q2.7": tranche };
      expect(
        posee("P2/permission-mineur", "Q2.8.1", reponses) !== undefined,
      ).toBe(posee_);
    },
  );
});

describe("un mineur de Q1.3 face à une permission adulte (TSREF-20261015-05)", () => {
  const proposees = (reponses: Reponses) => {
    const question = posee("P2/permission", "Q2.7", reponses);
    return question?.kind === "single choice"
      ? question.options.map(({ value }) => value)
      : [];
  };

  it("propose les quatre tranches à un patient sans mineur reconnu", () => {
    expect(proposees(PATIENT_SEUL)).toEqual([
      "1_MOINS_DE_SEIZE_ANS",
      "2_SEIZE_A_DIX_NEUF_ANS",
      "3_ADULTE_AUTORISEE",
      "4_ADULTE_A_SA_CHARGE",
    ]);
  });

  it("retire les deux options adultes quand Q1.3 dit un patient de moins de 18 ans", () => {
    const mineur: Reponses = {
      ...PATIENT_SEUL,
      "Q1.3": ["8_MINEUR_SOINS_CONTINUS"],
    };
    expect(proposees(mineur)).toEqual([
      "1_MOINS_DE_SEIZE_ANS",
      "2_SEIZE_A_DIX_NEUF_ANS",
    ]);
  });
});

describe("les faits de la permission", () => {
  it("laissent les deux faits comme ils étaient tant que Q2.7 n'est pas validée", () => {
    expect(deux(PATIENT_SEUL)).toEqual([undefined, undefined]);
  });

  it("3 : permission autorisée d'un adulte, les deux faits à « non »", () => {
    expect(deux({ ...PATIENT_SEUL, "Q2.7": "3_ADULTE_AUTORISEE" })).toEqual([
      false,
      false,
    ]);
  });

  it.each([
    ["1_OUI", true],
    ["2_NON", false],
    ["3_NE_SAIT_PAS", undefined],
  ] as const)(
    "4 avec Q2.7.a = %s : la charge patient vaut %s",
    (confirmation, charge) => {
      const reponses = { ...ADULTE_A_SA_CHARGE, "Q2.7.a": confirmation };
      expect(deux(reponses)).toEqual([charge, false]);
    },
  );

  it("4 sans confirmation « je ne peux pas le vérifier » trace « à vérifier »", () => {
    const reponses: Reponses = {
      ...ADULTE_A_SA_CHARGE,
      "Q2.7.a": "3_NE_SAIT_PAS",
    };
    expect(unFait(reponses, "fait_permission_charge_patient")).toEqual({
      provenance: "Q2.7.a : « 3_NE_SAIT_PAS ». À vérifier.",
    });
  });

  it.each(["1_MOINS_DE_SEIZE_ANS", "2_SEIZE_A_DIX_NEUF_ANS"] as const)(
    "%s : la charge patient vaut « non », car elle ne vaut que pour 20 ans ou plus",
    (tranche) => {
      const reponses = { ...MINEUR, "Q2.7": tranche };
      expect(unFait(reponses, "fait_permission_charge_patient")).toEqual({
        value: false,
        provenance: `Q2.7 : « ${tranche} ». La charge patient ne vaut que pour 20 ans ou plus.`,
      });
    },
  );

  it.each([
    ["1_OUI", true],
    ["2_NON", false],
    ["3_NE_SAIT_PAS", undefined],
  ] as const)(
    "Q2.8.4 = %s : l'admissibilité du mineur vaut %s",
    (autorisation, admissible) => {
      const reponses = { ...MINEUR, "Q2.8.4": autorisation };
      expect(deux(reponses)).toEqual([false, admissible]);
    },
  );

  it("Q2.8.4 « Non » trace R.1112-56", () => {
    expect(
      unFait(
        { ...MINEUR, "Q2.8.4": "2_NON" },
        "fait_permission_mineur_admissible",
      ).provenance,
    ).toMatch(/R\.1112-56/);
  });

  it("laisse l'admissibilité absente tant que Q2.8 n'est pas validée", () => {
    const {
      "Q2.8.4": _,
      "Q2.8.4.a": __,
      "Q2.8.5": ___,
      ...sansAutorisation
    } = MINEUR;
    expect(deux(sansAutorisation)).toEqual([false, undefined]);
  });

  it("le cadre de Q2.8.4.a ne change aucun fait", () => {
    const personnelle: Reponses = {
      ...MINEUR,
      "Q2.8.4.a": "3_DEMANDE_PERSONNELLE",
    };
    expect(faits(personnelle)).toEqual(faits(MINEUR));
  });
});

describe("une permission écarte le transfert et le Centre 15", () => {
  const DEUX_ECARTES = [
    "fait_transfert_article80",
    "fait_centre15_interetablissements",
  ] as const;
  const PAR_Q221A: Reponses = { ...SEJOUR, "Q2.2.1.a": "1_OUI" };

  it("par Q2.1 = Permission (l'option 9 n'est pas choisie)", () => {
    for (const nom of DEUX_ECARTES) {
      expect(unFait(PATIENT_SEUL, nom)).toEqual({
        value: false,
        provenance:
          "Q2.1 : « 11_PERMISSION » ; une permission n'est ni un transfert ni un déplacement pour soins (option 9 écartée).",
      });
    }
  });

  it("par Q2.2.1.a = Oui (l'option 2 est écartée)", () => {
    for (const nom of DEUX_ECARTES) {
      expect(unFait(PAR_Q221A, nom)).toEqual({
        value: false,
        provenance:
          "Q2.2.1.a : « 1_OUI » ; une permission n'est ni un transfert ni un déplacement pour soins (option 2 écartée).",
      });
    }
  });
});

describe("« je ne peux pas le vérifier » : l'impasse de la caisse", () => {
  // La règle de l'éditeur attend les deux faits de la permission indéfinis,
  // alors que le contrat en fixe un à « non » : la caisse n'est jamais atteinte.
  // Ces tests redeviendront rouges le jour où l'éditeur corrige.
  it.each([
    [
      "un mineur sans autorisation vérifiable",
      { ...MINEUR, "Q2.8.4": "3_NE_SAIT_PAS" },
    ],
    [
      "un adulte à sa charge sans confirmation vérifiable",
      { ...ADULTE_A_SA_CHARGE, "Q2.7.a": "3_NE_SAIT_PAS" },
    ],
  ] as const)("%s ne donne ni caisse ni issue", (_, reponses) => {
    const cibles = ciblesDe(reponses);
    expect(cibles.cible_couverture_inconnue_decisive).not.toBe(true);
    expect(cibles.cible_issue_id).toBeUndefined();
  });
});

describe("l'issue des règles", () => {
  it("un mineur admissible donne ISSUE_S3141", () => {
    expect(issue(MINEUR)).toBe("ISSUE_S3141");
  });

  it("un adulte à sa charge confirmé donne ISSUE_PERMISSION_PATIENT", () => {
    expect(issue(ADULTE_A_SA_CHARGE)).toBe("ISSUE_PERMISSION_PATIENT");
  });

  it.each([
    [
      "un adulte à sa charge non confirmé",
      { ...ADULTE_A_SA_CHARGE, "Q2.7.a": "2_NON" },
    ],
    [
      "une permission adulte autorisée",
      { ...PATIENT_SEUL, "Q2.7": "3_ADULTE_AUTORISEE" },
    ],
    ["un mineur non autorisé", { ...MINEUR, "Q2.8.4": "2_NON" }],
  ] as const)("%s ne donne ni S3141 ni PERMISSION_PATIENT", (_, reponses) => {
    expect(["ISSUE_S3141", "ISSUE_PERMISSION_PATIENT"]).not.toContain(
      issue(reponses),
    );
  });
});
