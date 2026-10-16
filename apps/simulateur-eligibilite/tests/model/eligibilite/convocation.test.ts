// La convocation (Q2.10) : quand la page se pose, ce qu'elle établit, et
// l'issue qu'elle donne. `CATALOGUE_COMPLET_QUESTIONS.md` Q2.10,
// `CONTRAT_REPONSES_FAITS.json` et `CONTRAT_NEGATIONS_PROUVEES.json` du paquet
// de l'éditeur (D-108).

import { describe, expect, it } from "vitest";
import {
  appareillage,
  ciblesDe,
  fait,
  issue,
  PAR_Q21,
  PAR_Q221B,
  posee,
  posees,
  type Reponses,
} from "./reponses-de-la-convocation";
import { PATIENT_SEUL } from "./reponses-de-la-permission";

const PAGE = "P2/convocation";

describe("quand la page de la convocation se pose", () => {
  it("se pose quand Q2.1 dit une convocation", () => {
    expect(posees(PAR_Q21)).toEqual(["Q2.10"]);
  });

  it("se pose quand Q2.2.1.b signale une convocation, même avec un autre motif", () => {
    expect(posees(PAR_Q221B)).toEqual(["Q2.10"]);
  });

  it.each([
    ["un motif sans convocation", { ...PATIENT_SEUL }],
    [
      "un autre cadre sans la convocation",
      {
        ...PATIENT_SEUL,
        "Q2.1": "1_CONSULTATION",
        "Q2.2.1": ["3_AUTRE_CADRE"],
        "Q2.2.1.b": ["1_ATMP"],
      },
    ],
    [
      "la convocation proposée et écartée en Q2.2.1",
      { ...PATIENT_SEUL, "Q2.1": "1_CONSULTATION" },
    ],
  ] as const)("ne se pose pas sur %s", (_, reponses) => {
    expect(posees(reponses)).toEqual([]);
  });

  it("ne repropose pas la convocation que Q2.1 a déjà dite", () => {
    const reponses: Reponses = { ...PAR_Q21, "Q2.2.1": ["3_AUTRE_CADRE"] };
    const question = posee("P2/contextes", "Q2.2.1.b", reponses);
    const valeurs =
      question?.kind === "multiple choice"
        ? question.options.map(({ value }) => value)
        : [];
    expect(valeurs).not.toContain("13_CONVOCATION");
    expect(valeurs).toContain("1_ATMP");
  });

  it("pose les sept catégories de Q2.10, dans l'ordre du catalogue", () => {
    const question = posee(PAGE, "Q2.10", PAR_Q21);
    expect(
      question?.kind === "single choice" &&
        question.options.map(({ value }) => value),
    ).toEqual([
      "1_CONTROLE_MEDICAL",
      "2_EXPERT_JURIDICTION",
      "3_AUDIENCE_CONSULTATION",
      "4_EXPERT_CONTESTATION",
      "5_COMMISSION_RECOURS",
      "6_APPAREILLAGE",
      "7_AUCUNE",
    ]);
  });

  it("pose Q2.10.a et Q2.10.b ensemble, sous l'option 6 seulement", () => {
    expect(posees({ ...PAR_Q21, "Q2.10": "6_APPAREILLAGE" })).toEqual([
      "Q2.10",
      "Q2.10.a",
      "Q2.10.b",
    ]);
    expect(posees({ ...PAR_Q21, "Q2.10": "1_CONTROLE_MEDICAL" })).toEqual([
      "Q2.10",
    ]);
  });
});

describe("les faits de la convocation", () => {
  it("laisse le fait comme il était tant que Q2.10 n'est pas validée", () => {
    expect(fait(PAR_Q21).value).toBeUndefined();
    expect(fait(PAR_Q221B)).toEqual({
      provenance: expect.stringMatching(/À qualifier dans sa branche/),
    });
  });

  it("ne tient pas Q2.10.a et Q2.10.b pour répondues sans leur page validée", () => {
    const { "Q2.10.a": _, ...sansAgrement } = appareillage(
      "1_OUI",
      "2_PODO_ORTHESE",
    );
    expect(fait(sansAgrement).value).toBeUndefined();
  });

  it.each([
    "1_CONTROLE_MEDICAL",
    "2_EXPERT_JURIDICTION",
    "3_AUDIENCE_CONSULTATION",
    "4_EXPERT_CONTESTATION",
    "5_COMMISSION_RECOURS",
  ] as const)("%s donne « oui »", (categorie) => {
    for (const base of [PAR_Q21, PAR_Q221B]) {
      expect(fait({ ...base, "Q2.10": categorie })).toEqual({
        value: true,
        provenance: `Q2.10 : « ${categorie} ».`,
      });
    }
  });

  it.each([
    ["1_PROTHESE_OCULAIRE_FACIALE"],
    ["2_PODO_ORTHESE"],
    ["3_ORTHOPROTHESE"],
  ] as const)("l'appareillage agréé (%s) donne « oui »", (appareil) => {
    expect(fait(appareillage("1_OUI", appareil))).toEqual({
      value: true,
      provenance: `Q2.10.a : « 1_OUI » ; Q2.10.b : « ${appareil} ».`,
    });
  });

  it.each([
    ["2_NON", "1_PROTHESE_OCULAIRE_FACIALE"],
    ["2_NON", "4_AUTRE"],
    ["2_NON", "5_NE_PEUX_PAS_PRECISER"],
    ["3_NE_PEUX_PAS_VERIFIER", "4_AUTRE"],
    ["1_OUI", "4_AUTRE"],
  ] as const)(
    "l'appareillage avec l'agrément %s et la catégorie %s donne « non »",
    (agrement, appareil) => {
      expect(fait(appareillage(agrement, appareil)).value).toBe(false);
    },
  );

  it("trace la raison du « non » : l'agrément, ou l'autre appareillage", () => {
    expect(fait(appareillage("2_NON", "2_PODO_ORTHESE")).provenance).toMatch(
      /^Q2\.10\.a : « 2_NON »/,
    );
    expect(fait(appareillage("1_OUI", "4_AUTRE")).provenance).toMatch(
      /^Q2\.10\.b : « 4_AUTRE »/,
    );
  });

  it.each([
    ["3_NE_PEUX_PAS_VERIFIER", "2_PODO_ORTHESE"],
    ["1_OUI", "5_NE_PEUX_PAS_PRECISER"],
    ["3_NE_PEUX_PAS_VERIFIER", "5_NE_PEUX_PAS_PRECISER"],
  ] as const)(
    "l'agrément %s avec la catégorie %s, sans rien de négatif, laisse le fait absent",
    (agrement, appareil) => {
      const resultat = fait(appareillage(agrement, appareil));
      expect(resultat.value).toBeUndefined();
      expect(resultat.provenance).toMatch(/^Q2\.10 : « 6_APPAREILLAGE »/);
    },
  );

  it("« aucune » après Q2.1 = convocation laisse le fait absent, jamais « oui »", () => {
    expect(fait({ ...PAR_Q21, "Q2.10": "7_AUCUNE" })).toEqual({
      provenance: expect.stringMatching(/alors que Q2\.1 annonçait/),
    });
  });

  it("« aucune » après Q2.2.1.b seule vaut « non »", () => {
    expect(fait({ ...PAR_Q221B, "Q2.10": "7_AUCUNE" })).toEqual({
      value: false,
      provenance: expect.stringMatching(/alors que Q2\.2\.1\.b annonçait/),
    });
  });

  it("n'établit rien quand la page ne se pose pas : le « non » de Q2.2.1 reste", () => {
    for (const reponses of [
      PATIENT_SEUL,
      { ...PATIENT_SEUL, "Q2.10": "1_CONTROLE_MEDICAL" } as const,
    ]) {
      expect(fait(reponses)).toEqual({
        value: false,
        provenance: "Q2.2.1 : « autre situation » proposée, non cochée.",
      });
    }
  });
});

describe("l'issue des règles", () => {
  it("une catégorie vérifiée donne ISSUE_CONVOCATION", () => {
    expect(issue({ ...PAR_Q21, "Q2.10": "1_CONTROLE_MEDICAL" })).toBe(
      "ISSUE_CONVOCATION",
    );
    expect(issue(appareillage("1_OUI", "3_ORTHOPROTHESE"))).toBe(
      "ISSUE_CONVOCATION",
    );
  });

  it("l'appareillage invérifiable donne ISSUE_CAISSE, avec sa raison dédiée (cible_reason_code)", () => {
    const cibles = ciblesDe(
      appareillage("3_NE_PEUX_PAS_VERIFIER", "2_PODO_ORTHESE"),
    );
    expect(cibles.cible_issue_id).toBe("ISSUE_CAISSE");
    expect(cibles.cible_reason_code).toBe(
      "CONVOCATION_CONDITION_NON_VERIFIABLE",
    );
  });

  it.each([
    ["un autre appareillage", appareillage("1_OUI", "4_AUTRE")],
    ["un fournisseur non agréé", appareillage("2_NON", "2_PODO_ORTHESE")],
  ] as const)("%s ne donne pas ISSUE_CONVOCATION", (_, reponses) => {
    expect(issue(reponses)).not.toBe("ISSUE_CONVOCATION");
  });

  it("« aucune » après Q2.1 = convocation ne donne pas ISSUE_CONVOCATION", () => {
    const reponses = { ...PAR_Q21, "Q2.10": "7_AUCUNE" } as const;
    expect(issue(reponses)).not.toBe("ISSUE_CONVOCATION");
    expect(issue(reponses)).toBe("ISSUE_CAISSE");
  });
});
