// L'ALD et le mineur en soins continus, posés en Q1.3 : les cas Q1.3 de
// `tests/audit_final_a.mjs` du paquet, sous leur identifiant chez l'éditeur, et
// `CONTRAT_Q13_ALD_MINEUR.json`.
//
// La preuve clinique de l'éditeur se lit dans P1 : un critère de Q1.2
// (« clinical: [1] »), l'aide nécessaire d'un proche (« autonomyChoice: 2 »),
// ou un patient qui se déplace seul (« autonomyChoice: 1 »).
//
// Trois familles de cas ne se posent pas en Q1.3 :
// - l'incertitude (`mineur-inconnu`, `ald-base-inconnue`,
//   `proche-mineur-inconnu`, `aucune-et-incertitude`) vient du rattrapage, en
//   P2 (#139) ;
// - l'âge incompatible (`adulte-mineur`) se constate par le validateur (#155) ;
// - le `doublon` est impossible : une case se coche une fois.

import { describe, expect, it } from "vitest";
import { model } from "../../../front/models/eligibilite";
import type { Faits } from "../../../front/models/eligibilite/declarations/faits";
import type { Questions } from "../../../front/models/eligibilite/declarations/questions";
import { preconisationOf } from "../../../front/socle/model";
import { askedQuestions } from "../../../front/socle/questionnaire-engine/asked-questions";
import {
  type Answers,
  pagesOf,
} from "../../../front/socle/questionnaire-engine/question";

type Reponses = Answers<Questions>;
type Cas = Questions["Q1.3"];

const pages = pagesOf(model.transportAndEligibility.parts);
const posees = (reponses: Reponses) =>
  pages.flatMap((page) => askedQuestions(pages, page, reponses));
const q13 = (reponses: Reponses) => {
  const question = posees(reponses).find((posee) => posee.id === "Q1.3");
  return question?.kind === "multiple choice" ? question : undefined;
};
const faits = (reponses: Reponses) =>
  preconisationOf(model, reponses).faits as Faits;

const BESOIN: Reponses = { "Q0.1": "1_VERIFIER" };
const CLINIQUE = (cas: Cas): Reponses => ({
  ...BESOIN,
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
  "Q1.2": ["1_PAS_AUTONOME"],
  "Q1.3": cas,
});
const PROCHE = (cas: Cas): Reponses => ({
  ...BESOIN,
  "Q1.1": "2_AVEC_UN_PROCHE",
  "Q1.3": cas,
});
const SEUL = (cas: Cas): Reponses => ({
  ...BESOIN,
  "Q1.1": "1_SEUL",
  "Q1.3": cas,
});

describe("les cas Q1.3 de l'éditeur", () => {
  it.each([
    ["ald-confirmee", CLINIQUE(["2_ALD"]), true, true, false],
    [
      "mineur-sans-ald",
      CLINIQUE(["8_MINEUR_SOINS_CONTINUS"]),
      false,
      undefined,
      true,
    ],
    [
      "ald-et-mineur",
      CLINIQUE(["2_ALD", "8_MINEUR_SOINS_CONTINUS"]),
      true,
      true,
      true,
    ],
    [
      "sans-deficience",
      SEUL(["2_ALD", "8_MINEUR_SOINS_CONTINUS"]),
      false,
      true,
      false,
    ],
    ["adulte-option-masquee", SEUL(["7_AUCUNE"]), false, undefined, false],
    ["proche-ald-confirmee", PROCHE(["2_ALD"]), true, true, false],
    [
      "proche-mineur-confirme",
      PROCHE(["8_MINEUR_SOINS_CONTINUS"]),
      false,
      undefined,
      true,
    ],
    [
      "proche-ald-mineur-confirmes",
      PROCHE(["2_ALD", "8_MINEUR_SOINS_CONTINUS"]),
      true,
      true,
      true,
    ],
  ] as const)("%s", (_id, reponses, liee, exonerante, mineur) => {
    const etabli = faits(reponses);
    expect(etabli.fait_ald_liee.value).toBe(liee);
    expect(etabli.fait_ald_exonerante_3_ou_4.value).toBe(exonerante);
    expect(etabli.fait_mineur_soins_prolonges_reconnus.value).toBe(mineur);
    expect(
      etabli.fait_mineur_soins_prolonges_a_verifier.value,
      "Seul un signalement du rattrapage met le mineur « à vérifier ».",
    ).toBeUndefined();
  });

  it("proche-ald-confirmee : le lien de l'ALD cite sa preuve, Q1.1", () => {
    expect(faits(PROCHE(["2_ALD"])).fait_ald_liee.provenance).toMatch(
      /Q1\.1 : l'aide d'un proche est nécessaire/,
    );
  });

  it("aucune-et-ald : « Aucune » ne se coche qu'à part", () => {
    expect(q13(CLINIQUE(["7_AUCUNE"]))?.exclusiveOption?.value).toBe(
      "7_AUCUNE",
    );
  });

  it("bariatrique-tap : la corpulence ne se propose pas sans ambulance", () => {
    const valeurs = q13(CLINIQUE(["7_AUCUNE"]))?.options.map(
      (option) => option.value,
    );
    expect(valeurs).not.toContain("1_FORTE_CORPULENCE");
  });

  it("hemodialyse-manquante : la dialyse attend Q1.3.a pour clore P1", () => {
    expect(faits(CLINIQUE(["5_DIALYSE"])).fait_p1_complete.value).toBe(false);
  });
});

describe("Q1.3 à l'écran", () => {
  it("suit l'ordre du contrat : le mineur après l'ALD", () => {
    const brancard: Reponses = {
      ...CLINIQUE(["7_AUCUNE"]),
      "Q1.2": ["8_BRANCARDAGE"],
    };
    expect(q13(brancard)?.options.map((option) => option.value)).toEqual([
      "1_FORTE_CORPULENCE",
      "2_ALD",
      "8_MINEUR_SOINS_CONTINUS",
      "3_CHIMIOTHERAPIE",
      "4_RADIOTHERAPIE",
      "5_DIALYSE",
    ]);
  });

  it("ne pose rien de plus pour une ALD en ambulance", () => {
    const ambulance = (cas: Cas): Reponses => ({
      ...CLINIQUE(cas),
      "Q1.2": ["8_BRANCARDAGE"],
    });
    const ids = (reponses: Reponses) => posees(reponses).map((q) => q.id);
    expect(ids(ambulance(["2_ALD"]))).toEqual(ids(ambulance(["7_AUCUNE"])));
  });
});
