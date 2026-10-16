// La page de la prestation (Q2.1) : ce qui s'y pose, d'après le catalogue de
// l'éditeur et D-102. Q2.1 se saute quand P1 prouve déjà un motif de transport.

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
const page = pages.find(({ id }) => id === "P2/prestation");
const posees = (reponses: Reponses) =>
  page ? askedQuestions(pages, page, reponses) : [];
const ids = (reponses: Reponses) => posees(reponses).map(({ id }) => id);
const optionsDeQ21 = (reponses: Reponses) => {
  const q21 = posees(reponses).find(({ id }) => id === "Q2.1");
  return q21 && "options" in q21 ? q21.options.map(({ value }) => value) : [];
};

const SEUL: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "1_SEUL",
  "Q1.3": ["7_AUCUNE"],
  "Q1.4": "1_VEHICULE_PERSONNEL",
};
const assis = (cas: Questions["Q1.3"], autres: Reponses = {}): Reponses => ({
  "Q0.1": "1_VERIFIER",
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
  "Q1.2": ["1_PAS_AUTONOME"],
  "Q1.3": cas,
  ...autres,
});

describe("Q2.1, le motif du déplacement", () => {
  it.each([
    ["un patient seul", SEUL],
    ["un transport assis", assis(["7_AUCUNE"])],
    [
      "une dialyse qui n'est pas une hémodialyse",
      assis(["5_DIALYSE"], { "Q1.3.a": "2_AUTRE_DIALYSE" }),
    ],
    [
      "une ALD sans déficience, chez un patient seul",
      { ...SEUL, "Q1.3": ["2_ALD", "8_MINEUR_SOINS_CONTINUS"] },
    ],
  ] as const)("se pose pour %s", (_, reponses) => {
    expect(ids(reponses)).toContain("Q2.1");
  });

  it.each([
    [
      "un brancard",
      {
        ...assis(["7_AUCUNE"]),
        "Q1.2": ["8_BRANCARDAGE"],
      } satisfies Reponses,
    ],
    ["une chimiothérapie", assis(["3_CHIMIOTHERAPIE"])],
    ["une hémodialyse", assis(["5_DIALYSE"], { "Q1.3.a": "1_OUI" })],
    ["une ALD à 100 %", assis(["2_ALD"])],
    [
      "une ALD à 100 %, avec un proche",
      { ...SEUL, "Q1.1": "2_AVEC_UN_PROCHE", "Q1.3": ["2_ALD"] },
    ],
    ["un mineur en soins continus", assis(["8_MINEUR_SOINS_CONTINUS"])],
  ] as const)("ne se pose pas quand P1 prouve un motif : %s", (_, reponses) => {
    expect(ids(reponses)).not.toContain("Q2.1");
  });

  it("propose les séances quand Q1.3 n'en coche aucune", () => {
    expect(optionsDeQ21(SEUL)).toContain("6_SEANCE");
  });

  it("ne repropose pas les séances déjà cochées en Q1.3", () => {
    const reponses = assis(["5_DIALYSE"], { "Q1.3.a": "2_AUTRE_DIALYSE" });
    expect(optionsDeQ21(reponses)).not.toContain("6_SEANCE");
  });

  it("ne pose ni a à e, ni i à l, ni le régime", () => {
    expect(ids({ ...SEUL, "Q2.1": "3_IMAGERIE" })).toEqual(["Q2.1"]);
  });
});

describe("les sous-questions de Q2.1", () => {
  it("pose g pour une hospitalisation", () => {
    expect(ids({ ...SEUL, "Q2.1": "8_HOSPITALISATION" })).toEqual([
      "Q2.1",
      "Q2.1.g",
    ]);
  });

  it("pose h pour un soin CAMSP ou CMPP", () => {
    expect(ids({ ...SEUL, "Q2.1": "10_CAMSP" })).toEqual(["Q2.1", "Q2.1.h"]);
  });

  it("pose f pour plusieurs séances, même quand Q2.1 se saute", () => {
    expect(ids(assis(["3_CHIMIOTHERAPIE", "4_RADIOTHERAPIE"]))).toEqual([
      "Q2.1.f",
    ]);
  });

  it("ne pose pas f pour une seule séance : la page ne s'affiche pas", () => {
    expect(ids(assis(["3_CHIMIOTHERAPIE"]))).toEqual([]);
  });

  it("bloque f quand les séances ne sont pas le même déplacement", () => {
    const f = posees(assis(["3_CHIMIOTHERAPIE", "4_RADIOTHERAPIE"])).find(
      ({ id }) => id === "Q2.1.f",
    );
    const non =
      f && "options" in f
        ? f.options.find(({ value }) => value === "2_NON")
        : undefined;
    expect(non?.blocks).toContain("une simulation par déplacement");
  });
});
