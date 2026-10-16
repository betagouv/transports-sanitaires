// Les réponses et les lectures que partagent les tests de la branche (Q2.12,
// Q2.13 et Q2.14) et de la fin de P2.

import {
  ciblesDe,
  faits,
  issue,
  PATIENT_SEUL,
  posee,
  type Reponses,
} from "./reponses-de-la-permission";

export { ciblesDe, faits, issue, posee, type Reponses };

// Un patient seul, dont le motif est la maternité éloignée : Q2.14.1 se pose.
export const MATERNITE: Reponses = { ...PATIENT_SEUL, "Q2.1": "13_MATERNITE" };

// Une consultation, avec une maternité éloignée signalée en Q2.2.1.b.
export const MATERNITE_PAR_Q221B: Reponses = {
  ...PATIENT_SEUL,
  "Q2.1": "1_CONSULTATION",
  "Q2.2.1": ["3_AUTRE_CADRE"],
  "Q2.2.1.b": ["4_MATERNITE_ELOIGNEE"],
};

// Une consultation, avec un hébergement temporaire non médicalisé en Q2.2.1.b.
export const HTNM: Reponses = {
  ...MATERNITE_PAR_Q221B,
  "Q2.2.1.b": ["5_HTNM"],
};

// Une entrée en établissement de santé : le transfert reste à qualifier.
export const ENTREE: Reponses = {
  ...PATIENT_SEUL,
  "Q2.1": "8_HOSPITALISATION",
  "Q2.1.g": "1_ENTREE",
};

// Le brancard prouve le motif, 20 km, sans autre situation : l'issue la plus
// courte de P2, sans page de branche.
export const BRANCARD_20_KM: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
  "Q1.2": ["8_BRANCARDAGE"],
  "Q1.3": ["7_AUCUNE"],
  "Q2.2.1": ["4_AUCUNE"],
  "Q2.3.1": "1_CINQUANTE_KM_OU_MOINS",
  "Q2.3.2": false,
};

const PAGE = "P2/branche";

type Id = "Q2.12" | "Q2.13.depart" | "Q2.14.1" | "Q2.14.2";

/** Les ids posés sur la page de branche, dans l'ordre de la page. */
export const posees = (reponses: Reponses) =>
  (["Q2.13.depart", "Q2.14.2", "Q2.14.1", "Q2.12"] as const).filter(
    (id: Id) => posee(PAGE, id, reponses) !== undefined,
  );

export const incoherences = (id: Id, reponses: Reponses) =>
  posee(PAGE, id, reponses)?.inconsistencies ?? [];

export const p2Complete = (reponses: Reponses) =>
  faits(reponses).fait_p2_complete.value;
