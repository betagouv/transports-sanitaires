// La page du trajet de P2 : ce qui s'y pose, d'après le catalogue de
// l'éditeur. La série se révèle sur la même page, sous la distance.

import { describe, expect, it } from "vitest";
import { model } from "../../../front/models/eligibilite";
import type { Questions } from "../../../front/models/eligibilite/declarations/questions";
import { askedQuestions } from "../../../front/socle/questionnaire-engine/asked-questions";
import {
  type Answers,
  pagesOf,
} from "../../../front/socle/questionnaire-engine/question";

type Reponses = Answers<Questions>;

const pages = pagesOf(model.transportAndEligibility.parts);
const page = pages.find(({ id }) => id === "P2/trajet");
const posees = (reponses: Reponses) =>
  page ? askedQuestions(pages, page, reponses).map(({ id }) => id) : [];

const SEUL: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "1_SEUL",
  "Q1.3": ["7_AUCUNE"],
  "Q1.4": "1_VEHICULE_PERSONNEL",
  "Q2.1": "1_CONSULTATION",
  "Q2.2.1": ["4_AUCUNE"],
};

describe("la page du trajet", () => {
  it("demande d'abord la distance", () => {
    expect(posees(SEUL)).toEqual(["Q2.3.1", "Q2.3.2"]);
  });

  it.each(["2_PLUS_DE_CINQUANTE_KM", "3_PLUS_DE_CENT_CINQUANTE_KM"] as const)(
    "pose la série pour un trajet de %s",
    (distance) => {
      expect(
        posees({ ...SEUL, "Q2.3.1": distance, "Q2.3.2": false }),
      ).toContain("Q2.3.3");
    },
  );

  it("ne pose pas la série pour un trajet de 50 km ou moins", () => {
    expect(
      posees({ ...SEUL, "Q2.3.1": "1_CINQUANTE_KM_OU_MOINS", "Q2.3.2": false }),
    ).toEqual(["Q2.3.1", "Q2.3.2"]);
  });

  // L'urgence suit la garde de l'éditeur, `cible_question_urgence_a_afficher`.
  it.each([
    ["au-delà de 150 km", { "Q2.3.1": "3_PLUS_DE_CENT_CINQUANTE_KM" }],
    [
      "avec un avion ou un bateau",
      { "Q2.3.1": "1_CINQUANTE_KM_OU_MOINS", "Q2.3.2": true },
    ],
    [
      "pour une série",
      { "Q2.3.1": "2_PLUS_DE_CINQUANTE_KM", "Q2.3.3": "1_OUI" },
    ],
  ] as const)("pose l'urgence %s", (_, trajet) => {
    expect(posees({ ...SEUL, "Q2.3.2": false, ...trajet })).toContain("Q2.3.4");
  });

  it.each([
    ["à 50 km ou moins", { "Q2.3.1": "1_CINQUANTE_KM_OU_MOINS" }],
    [
      "sans série, jusqu'à 150 km",
      { "Q2.3.1": "2_PLUS_DE_CINQUANTE_KM", "Q2.3.3": "2_NON" },
    ],
  ] as const)("ne pose pas l'urgence %s", (_, trajet) => {
    expect(posees({ ...SEUL, "Q2.3.2": false, ...trajet })).not.toContain(
      "Q2.3.4",
    );
  });

  it("pose l'urgence pour une ambulance à 200 km", () => {
    expect(
      posees({
        "Q0.1": "1_VERIFIER",
        "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
        "Q1.2": ["8_BRANCARDAGE"],
        "Q1.3": ["7_AUCUNE"],
        "Q2.2.1": ["4_AUCUNE"],
        "Q2.3.1": "3_PLUS_DE_CENT_CINQUANTE_KM",
        "Q2.3.2": false,
      }),
    ).toContain("Q2.3.4");
  });

  it("pose l'urgence pour une séance du CAMSP, même à 50 km ou moins", () => {
    expect(
      posees({
        ...SEUL,
        "Q2.1": "10_CAMSP",
        "Q2.1.h": "1_OUI",
        "Q2.3.1": "1_CINQUANTE_KM_OU_MOINS",
        "Q2.3.2": false,
      }),
    ).toContain("Q2.3.4");
  });

  it("pose l'urgence pour un CAMSP coché en Q2.2.1.b, même à 50 km ou moins", () => {
    expect(
      posees({
        ...SEUL,
        "Q2.2.1": ["3_AUTRE_CADRE"],
        "Q2.2.1.b": ["6_CAMSP"],
        "Q2.3.1": "1_CINQUANTE_KM_OU_MOINS",
        "Q2.3.2": false,
      }),
    ).toContain("Q2.3.4");
  });
});
