// Les réponses et les lectures que partagent les tests du transfert (Q2.5) et
// des exceptions de l'article 80 (Q2.6.a et Q2.6).

import { model } from "../../../front/models/eligibilite";
import type { Faits } from "../../../front/models/eligibilite/declarations/faits";
import type { Questions } from "../../../front/models/eligibilite/declarations/questions";
import { preconisationOf } from "../../../front/socle/model";
import { askedQuestions } from "../../../front/socle/questionnaire-engine/asked-questions";
import {
  type Answers,
  pagesOf,
} from "../../../front/socle/questionnaire-engine/question";

export type Reponses = Answers<Questions>;

export const pages = pagesOf(model.transportAndEligibility.parts);
export const posee = (
  idDePage: string,
  id: keyof Questions,
  reponses: Reponses,
) => {
  const page = pages.find(({ id: candidate }) => candidate === idDePage);
  return (page ? askedQuestions(pages, page, reponses) : []).find(
    (candidate) => candidate.id === id,
  );
};
export const proposees = (reponses: Reponses) => {
  const question = posee("P2/exceptions", "Q2.6", reponses);
  return question?.kind === "multiple choice"
    ? question.options.map(({ value }) => value)
    : [];
};
export const faits = (reponses: Reponses) =>
  preconisationOf(model, reponses).faits as Faits;
export const valeurs = (reponses: Reponses, noms: readonly (keyof Faits)[]) =>
  noms.map((nom) => faits(reponses)[nom].value);

export const TRAJET: Reponses = {
  "Q2.3.1": "1_CINQUANTE_KM_OU_MOINS",
  "Q2.3.2": false,
};
// Le brancard prouve le motif : Q2.1 ne se pose pas. Le séjour est coché, et
// la permission écartée : c'est un déplacement pendant l'hospitalisation.
export const SEJOUR: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
  "Q1.2": ["8_BRANCARDAGE"],
  "Q1.3": ["7_AUCUNE"],
  "Q2.2.1": ["1_HOSPITALISATION"],
  "Q2.2.1.a": "2_NON",
  ...TRAJET,
};
// Le patient seul d'un transfert depuis les urgences : le séjour est écarté.
export const URGENCES: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "1_SEUL",
  "Q1.3": ["7_AUCUNE"],
  "Q1.4": "1_VEHICULE_PERSONNEL",
  "Q2.1": "9_TRANSFERT",
  "Q2.2.1": ["4_AUCUNE"],
  ...TRAJET,
};
export const HAD_A_DOMICILE: Reponses = {
  ...URGENCES,
  "Q2.1": "8_HOSPITALISATION",
  "Q2.1.g": "3_ADMISSION_HAD",
};

export const EXCEPTIONS = [
  "fait_exception_article80_admission_sans_sejour",
  "fait_exception_article80_air_mer",
  "fait_exception_article80_had_intercurrent",
  "fait_exception_article80_usld",
  "fait_exception_article80_ehpad",
  "fait_exception_article80_radiotherapie",
  "fait_exception_article80_dialyse_domicile",
  "fait_exception_article80_admission_had",
] as const;

export const definitif = (
  exceptions: Questions["Q2.6"],
  base = SEJOUR,
): Reponses => ({
  ...base,
  "Q2.5": "1_TRANSFERT",
  "Q2.6.a": "1_DEFINITIF",
  "Q2.6": exceptions,
});
export const provisoire = (
  exceptions: Questions["Q2.6"],
  base = SEJOUR,
): Reponses => ({
  ...definitif(exceptions, base),
  "Q2.6.a": "2_PROVISOIRE",
});
