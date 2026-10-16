// Les aides des tests de l'accord préalable (#136) : une demande écrite à la
// main, et le motif qu'elle donne dans la réservation.

import type { Cibles } from "../../../front/models/eligibilite/declarations/cibles";
import { type Ajouts, fiche, NON_PARTAGE, puces, TAP } from "./fiches-du-test";

export const SANS_URGENCE = "ISSUE_DAP_SANS_URGENCE";
export const URGENCE = "ISSUE_DAP_URGENCE_ATTESTEE";

export const LONGUE_DISTANCE = {
  cible_dap_motif_longue_distance: true,
} as const;
export const DIALYSE = {
  cible_hospitalisation_ou_seances_assimilees: true,
} as const;
export const PRECISION_DIALYSE: Ajouts = {
  precisions: { hospitalisation: "H-SEANCE-HE" },
};

export const demande = (
  cibles: Partial<Cibles>,
  ajouts: Ajouts = {},
  issue: typeof SANS_URGENCE | typeof URGENCE = SANS_URGENCE,
) => fiche({ ...TAP, ...NON_PARTAGE, ...cibles }, ajouts, issue);

// La puce de la réservation qui reprend le motif administratif.
export const motif = (texte: ReturnType<typeof demande>) =>
  puces(texte).find(({ texte: puce }) => puce.includes("au titre d"))?.texte;
