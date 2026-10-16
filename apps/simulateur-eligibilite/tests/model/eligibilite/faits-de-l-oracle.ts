// Les faits de l'oracle de l'éditeur, et les situations qu'il nomme.
//
// Un cas part de faits tous à « non », P1 et P2 complètes, et n'en change que
// quelques-uns. Un fait changé en `undefined` est absent : il n'est pas
// transmis aux règles.

import type { Cibles } from "../../../front/models/eligibilite/declarations/cibles";
import {
  FAITS,
  type Faits,
} from "../../../front/models/eligibilite/declarations/faits";
import { cibles } from "../../../front/models/eligibilite/evaluation-des-regles";

export type Changements = Partial<Record<keyof Faits, boolean | undefined>>;
export type Issue = NonNullable<Cibles["cible_issue_id"]>;

export const ABSENTS = Object.fromEntries(
  FAITS.map((fait) => [fait, undefined]),
);
const TOUS_NON = Object.fromEntries(FAITS.map((fait) => [fait, false]));

// Les faits de ces valeurs, tels que le modèle les transmet.
export const faitsDe = (valeurs: Changements) =>
  Object.fromEntries(
    Object.entries(valeurs).map(([fait, value]) => [
      fait,
      { value, provenance: "oracle de l'éditeur" },
    ]),
  ) as Faits;

export const preconiser = (changements: Changements) =>
  cibles(
    faitsDe({
      ...TOUS_NON,
      fait_p1_complete: true,
      fait_p2_complete: true,
      ...changements,
    }),
  );

// Aucun profil de code de soin ne prouve à lui seul un motif de transport.
const SITUATION: Changements = {
  fait_situation_soins_qualifiante: true,
  fait_regime_verifie: true,
};
export const BRANCARD: Changements = { fait_critere_brancard: true };
export const ALD: Changements = {
  fait_ald_liee: true,
  fait_ald_exonerante_3_ou_4: true,
  fait_critere_tap: true,
  fait_autonomie_professionnel: true,
};
export const SERIE: Changements = {
  fait_distance_plus_50: true,
  fait_serie_qualifiante: true,
  fait_urgence_repondue: true,
};
export const LONGUE_DISTANCE: Changements = {
  fait_distance_plus_150: true,
  fait_urgence_repondue: true,
};
export const TRANSFERT: Changements = {
  fait_transfert_article80: true,
  fait_hospitalisation: true,
};
export const MATERNITE: Changements = {
  fait_evenement_sans_soin: true,
  fait_dap_maternite: true,
  fait_urgence_repondue: true,
};
export const HOSPITALISATION: Changements = {
  ...SITUATION,
  fait_hospitalisation: true,
};
export const URGENCE: Changements = { fait_urgence_attestee: true };
export const CONVOCATION: Changements = {
  fait_convocation: true,
  fait_evenement_sans_soin: true,
};
export const ALD_NON_EXONERANTE: Changements = {
  ...ALD,
  fait_ald_exonerante_3_ou_4: false,
};
