// Les réponses et les lectures que partagent les tests de la permission (Q2.7
// et Q2.8).

import { cibles } from "../../../front/models/eligibilite/evaluation-des-regles";
import { validatedQuestions } from "../../../front/socle/questionnaire-engine/asked-questions";
import { faits, pages, posee, type Reponses } from "./reponses-du-transfert";

export { faits, posee, type Reponses };

// Un patient seul, dont le motif est une permission : le séjour ne s'y propose
// pas, et ni le transfert ni les exceptions ne se posent.
export const PATIENT_SEUL: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "1_SEUL",
  "Q1.3": ["7_AUCUNE"],
  "Q1.4": "1_VEHICULE_PERSONNEL",
  "Q2.1": "11_PERMISSION",
  "Q2.2.1": ["4_AUCUNE"],
  "Q2.3.1": "1_CINQUANTE_KM_OU_MOINS",
  "Q2.3.2": false,
};

// Un mineur admissible : hospitalisé le 1er octobre, première permission le
// 14e jour, de 24 heures, autorisée, sans autre permission.
export const MINEUR: Reponses = {
  ...PATIENT_SEUL,
  "Q2.7": "1_MOINS_DE_SEIZE_ANS",
  "Q2.8.1": "2026-10-01",
  "Q2.8.2": "2026-10-14T09:00",
  "Q2.8.3": "2026-10-15T09:00",
  "Q2.8.4": "1_OUI",
  "Q2.8.4.a": "1_SOINS",
  "Q2.8.5": "2_NON",
};

export const PLUSIEURS_PERMISSIONS: Reponses = {
  ...MINEUR,
  "Q2.8.5": "1_OUI",
  "Q2.8.6": "2026-12-01",
  "Q2.8.6.a": 2,
  "Q2.8.6.b": "1_OUI",
};

const PAGE_DU_MINEUR = "P2/permission-mineur";

/** Les messages d'incohérence d'une question de la page du mineur. */
export const incoherences = (id: keyof Reponses, reponses: Reponses) =>
  posee(PAGE_DU_MINEUR, id, reponses)?.inconsistencies ?? [];

/** La question est-elle validée : posée, répondue, sans blocage ? */
export const validee = (id: keyof Reponses, reponses: Reponses) =>
  validatedQuestions(pages, reponses)[id] !== undefined;

/** Les cibles des règles, sur les faits que les réponses établissent. */
export const ciblesDe = (reponses: Reponses) => cibles(faits(reponses));

export const issue = (reponses: Reponses) => ciblesDe(reponses).cible_issue_id;
