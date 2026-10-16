// Les réponses et les lectures que partagent les tests de la convocation (Q2.10).

import {
  ciblesDe,
  faits,
  issue,
  PATIENT_SEUL,
  posee,
  type Reponses,
} from "./reponses-de-la-permission";

export { ciblesDe, faits, issue, posee, type Reponses };

// Un patient seul dont le motif est une convocation : Q2.10 se pose, et le
// séjour ne s'y propose pas.
export const PAR_Q21: Reponses = { ...PATIENT_SEUL, "Q2.1": "12_CONVOCATION" };

// Un patient seul, dont le motif est une consultation, mais qui signale une
// convocation en Q2.2.1.b.
export const PAR_Q221B: Reponses = {
  ...PATIENT_SEUL,
  "Q2.1": "1_CONSULTATION",
  "Q2.2.1": ["3_AUTRE_CADRE"],
  "Q2.2.1.b": ["13_CONVOCATION"],
};

/** Q2.10 = 6, avec l'agrément et l'appareillage donnés. */
export const appareillage = (
  agrement: Reponses["Q2.10.a"],
  appareil: Reponses["Q2.10.b"],
  base: Reponses = PAR_Q21,
): Reponses => ({
  ...base,
  "Q2.10": "6_APPAREILLAGE",
  "Q2.10.a": agrement,
  "Q2.10.b": appareil,
});

const PAGE = "P2/convocation";

/** Les ids posés sur la page de la convocation. */
export const posees = (reponses: Reponses) =>
  (["Q2.10", "Q2.10.a", "Q2.10.b"] as const).filter(
    (id) => posee(PAGE, id, reponses) !== undefined,
  );

export const fait = (reponses: Reponses) => faits(reponses).fait_convocation;
