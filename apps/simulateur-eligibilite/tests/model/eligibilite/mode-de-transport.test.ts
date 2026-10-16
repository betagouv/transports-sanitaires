// P0 et P1 du modèle de l'éditeur : les pages qui s'affichent, les options qui
// se proposent, les faits que les réponses établissent, et le mode que les
// règles en tirent.
//
// Le catalogue de l'éditeur fait foi pour les questions, et
// `CONTRAT_REPONSES_FAITS.json` avec son correctif pour les faits.

import { describe, expect, it } from "vitest";
import { model } from "../../../front/models/eligibilite";
import type { Questions } from "../../../front/models/eligibilite/declarations/questions";
import { preconisationOf } from "../../../front/socle/model";
import {
  askedPages,
  askedQuestions,
} from "../../../front/socle/questionnaire-engine/asked-questions";
import {
  type Answers,
  pagesOf,
} from "../../../front/socle/questionnaire-engine/question";

type Reponses = Answers<Questions>;

const pages = pagesOf(model.transportAndEligibility.parts);
const pagesAffichees = (reponses: Reponses) =>
  askedPages(pages, reponses).map((page) => page.id);
const question = (id: keyof Questions, reponses: Reponses) => {
  const posees = pages.flatMap((page) => askedQuestions(pages, page, reponses));
  return posees.find((posee) => posee.id === id);
};
const optionsDe = (id: keyof Questions, reponses: Reponses) => {
  const posee = question(id, reponses);
  return posee && "options" in posee
    ? posee.options.map((option) => option.value)
    : [];
};
const modeDe = (reponses: Reponses) =>
  preconisationOf(model, reponses).cibles.cible_mode_id;

const SEUL: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "1_SEUL",
  "Q1.3": ["7_AUCUNE"],
  "Q1.4": "1_VEHICULE_PERSONNEL",
};
const AVEC_UN_PROCHE: Reponses = { ...SEUL, "Q1.1": "2_AVEC_UN_PROCHE" };
const avecUnProfessionnel = (
  criteres: Questions["Q1.2"],
  cas: Questions["Q1.3"] = ["7_AUCUNE"],
): Reponses => ({
  "Q0.1": "1_VERIFIER",
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
  "Q1.2": criteres,
  "Q1.3": cas,
});
const BRANCARD = avecUnProfessionnel(["8_BRANCARDAGE"]);

describe("les pages de P0 et P1, jusqu'au trajet", () => {
  // Le brancard prouve déjà un motif de transport : la prestation (Q2.1) ne
  // se pose pas (D-102). Les situations particulières se posent toujours
  // (D-98).
  it("un patient autonome saute les critères et dit sa préférence", () => {
    expect(pagesAffichees(SEUL)).toEqual([
      "P0/1",
      "P1/1",
      "P1/3",
      "P1/4",
      "P2/prestation",
      "P2/contextes",
      "P2/trajet",
    ]);
  });

  it("un patient accompagné d'un proche suit le même chemin", () => {
    expect(pagesAffichees(AVEC_UN_PROCHE)).toEqual([
      "P0/1",
      "P1/1",
      "P1/3",
      "P1/4",
      "P2/prestation",
      "P2/contextes",
      "P2/trajet",
    ]);
  });

  it("l'aide d'un professionnel pose les critères, pas la préférence", () => {
    expect(pagesAffichees(BRANCARD)).toEqual([
      "P0/1",
      "P1/1",
      "P1/2",
      "P1/3",
      "P2/contextes",
      "P2/trajet",
    ]);
  });
});

describe("le mode de transport", () => {
  it.each([
    ["AMBULANCE", BRANCARD],
    ["TPMR", avecUnProfessionnel(["6_FAUTEUIL_SANS_TRANSFERT"])],
    ["TAP", avecUnProfessionnel(["1_PAS_AUTONOME"])],
    ["TRANSPORT_COMMUN", { ...SEUL, "Q1.4": "2_TRANSPORTS_EN_COMMUN" }],
    ["VEHICULE_PERSONNEL", SEUL],
  ] as const)("%s se déduit des réponses", (mode, reponses) => {
    expect(modeDe(reponses)).toBe(mode);
  });
});

describe("les options de Q1.3", () => {
  it.each([
    [
      "un transport assis professionnel",
      avecUnProfessionnel(["1_PAS_AUTONOME"]),
    ],
    [
      "un fauteuil sans transfert",
      avecUnProfessionnel(["6_FAUTEUIL_SANS_TRANSFERT"]),
    ],
  ] as const)("le transport partagé se propose pour %s", (_, reponses) => {
    expect(optionsDe("Q1.3", reponses)).toContain("6_PARTAGE_INCOMPATIBLE");
  });

  it("le transport partagé ne se propose ni avec l'ambulance, ni sans professionnel", () => {
    expect(optionsDe("Q1.3", BRANCARD)).not.toContain("6_PARTAGE_INCOMPATIBLE");
    expect(optionsDe("Q1.3", SEUL)).not.toContain("6_PARTAGE_INCOMPATIBLE");
  });

  it("la forte corpulence ne se propose qu'avec un critère d'ambulance", () => {
    expect(optionsDe("Q1.3", BRANCARD)).toContain("1_FORTE_CORPULENCE");
    expect(
      optionsDe("Q1.3", avecUnProfessionnel(["1_PAS_AUTONOME"])),
    ).not.toContain("1_FORTE_CORPULENCE");
  });

  it("Q1.3.a ne se pose que si la dialyse est cochée", () => {
    expect(question("Q1.3.a", BRANCARD)).toBeUndefined();
    expect(
      question("Q1.3.a", avecUnProfessionnel(["8_BRANCARDAGE"], ["5_DIALYSE"])),
    ).toBeDefined();
  });
});

describe("le libellé de Q1.4", () => {
  it("dit « en toute autonomie » pour un patient qui se déplace seul", () => {
    expect(question("Q1.4", SEUL)?.label).toContain("en toute autonomie");
  });

  it("dit « avec l’aide d’un proche » pour un patient accompagné", () => {
    expect(question("Q1.4", AVEC_UN_PROCHE)?.label).toContain(
      "avec l’aide d’un proche",
    );
  });
});
