// La cohérence des réponses de P1, et le retour en P1 : `tests/audit_final_a.mjs`
// du paquet, et `validateAnswers` et `reconcileAfterP1`, qui servent d'oracle.
//
// L'éditeur refuse une réponse incohérente sur sa page, avant « Suivant ». Le
// socle le fait déjà : une incompatibilité (`incompatibleOptions`), un blocage
// (`blocks`), ou une question qui ne se pose pas (`askedIf`, `offeredIf`). Les
// contradictions des pages encore à poser (permission, implantation, pays,
// dates…) arrivent avec leurs questions.

import { describe, expect, it } from "vitest";
import { model } from "../../../front/models/eligibilite";
import type { Faits } from "../../../front/models/eligibilite/declarations/faits";
import {
  OPTIONS,
  type Questions,
} from "../../../front/models/eligibilite/declarations/questions";
import {
  faitsDuMode,
  modeDe,
} from "../../../front/models/eligibilite/mode-de-transport";
import type { Validated } from "../../../front/socle";
import { preconisationOf } from "../../../front/socle/model";
import {
  askedQuestions,
  validatedQuestions,
} from "../../../front/socle/questionnaire-engine/asked-questions";
import { isAnswered } from "../../../front/socle/questionnaire-engine/offered-answer";
import {
  type Answers,
  pagesOf,
} from "../../../front/socle/questionnaire-engine/question";

type Reponses = Answers<Questions>;
type Critere = Questions["Q1.2"][number];

const pages = pagesOf(model.transportAndEligibility.parts);
const PRO: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
};
const q12 = pages
  .flatMap((page) => askedQuestions(pages, page, PRO))
  .find(({ id }) => id === "Q1.2");
const CRITERES = Object.keys(OPTIONS["Q1.2"]) as Critere[];

// Le masque de l'éditeur : le bit n donne le critère n + 1 du catalogue.
const criteresDu = (masque: number) =>
  CRITERES.filter((_, rang) => masque & (1 << rang));
const numeros = (criteres: readonly Critere[]) =>
  criteres.map((critere) => Number(critere.split("_")[0]));
const modeAttendu = (criteres: readonly Critere[]) => {
  const ids = numeros(criteres);
  if (ids.some((id) => id >= 7)) return "AMBULANCE";
  return ids.includes(6) ? "TPMR" : "TAP";
};

describe("les 2 048 combinaisons de Q1.2", () => {
  const masques = Array.from({ length: 2048 }, (_, masque) => masque);
  const acceptees = masques.filter(
    (masque) => q12 && isAnswered(q12, criteresDu(masque)),
  );

  it("en acceptent 1 151, et en refusent 897", () => {
    expect(acceptees).toHaveLength(1151);
    expect(masques.length - acceptees.length).toBe(897);
  });

  it("refusent le vide, fauteuil et allongé, hygiène et asepsie", () => {
    const refusees = masques.filter((masque) => !acceptees.includes(masque));
    expect(
      refusees.every((masque) => {
        const ids = numeros(criteresDu(masque));
        const avec = (a: number, b: number) =>
          ids.includes(a) && ids.includes(b);
        return ids.length === 0 || avec(6, 7) || avec(4, 11);
      }),
    ).toBe(true);
  });

  // Le mode ne lit que les faits des critères : il s'évalue une fois par
  // jeu de faits, comme l'éditeur évalue ses faits fermés.
  it("donnent le mode de l'éditeur à chaque combinaison acceptée", () => {
    const modes = new Map<string, ReturnType<typeof modeDe>>();
    const ecarts = acceptees.filter((masque) => {
      const criteres = criteresDu(masque);
      const validated: Validated<Questions> = {
        "Q1.1": { answer: "3_AVEC_UN_PROFESSIONNEL" },
        "Q1.2": { answer: criteres },
        "Q1.3": { answer: ["7_AUCUNE"] },
      };
      const cle = JSON.stringify(faitsDuMode(validated));
      if (!modes.has(cle)) modes.set(cle, modeDe(validated));
      return modes.get(cle) !== modeAttendu(criteres);
    });
    expect(ecarts).toEqual([]);
  });
});

describe("le retour en P1", () => {
  const AMBULANCE: Reponses = {
    ...PRO,
    "Q1.2": ["8_BRANCARDAGE"],
    "Q1.3": ["1_FORTE_CORPULENCE", "2_ALD", "8_MINEUR_SOINS_CONTINUS"],
  };
  const faits = (reponses: Reponses) =>
    preconisationOf(model, reponses).faits as Faits;

  it("au retrait du brancard, efface la corpulence et garde l'ALD et le mineur", () => {
    const sansBrancard = { ...AMBULANCE, "Q1.2": ["1_PAS_AUTONOME"] };
    expect(
      validatedQuestions(pages, sansBrancard as Reponses)["Q1.3"]?.answer,
    ).toEqual(["2_ALD", "8_MINEUR_SOINS_CONTINUS"]);
    const etabli = faits(sansBrancard as Reponses);
    expect(etabli.fait_bariatrique.value).toBe(false);
    expect(etabli.fait_ald_liee.value).toBe(true);
    expect(etabli.fait_ald_exonerante_3_ou_4.value).toBe(true);
    expect(etabli.fait_mineur_soins_prolonges_reconnus.value).toBe(true);
  });

  it("passé du professionnel au proche, garde l'ALD sur sa nouvelle preuve", () => {
    const { "Q1.2": _, ...sansCriteres } = AMBULANCE;
    const etabli = faits({ ...sansCriteres, "Q1.1": "2_AVEC_UN_PROCHE" });
    expect(etabli.fait_ald_liee.value).toBe(true);
    expect(etabli.fait_ald_liee.provenance).toMatch(/Q1\.1/);
    expect(etabli.fait_mineur_soins_prolonges_reconnus.value).toBe(true);
  });

  it("passé au patient seul, retire la déficience, pas les réponses", () => {
    const { "Q1.2": _, ...sansCriteres } = AMBULANCE;
    const seul = { ...sansCriteres, "Q1.1": "1_SEUL" } satisfies Reponses;
    expect(validatedQuestions(pages, seul)["Q1.3"]?.answer).toEqual([
      "2_ALD",
      "8_MINEUR_SOINS_CONTINUS",
    ]);
    expect(faits(seul).fait_ald_liee.value).toBe(false);
    expect(faits(seul).fait_mineur_soins_prolonges_reconnus.value).toBe(false);
  });
});
