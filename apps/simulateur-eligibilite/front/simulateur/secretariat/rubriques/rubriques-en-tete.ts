// L'en-tête des trois formulaires, recopiée du YAML documentaire de la v9.7 :
// l'identité du bénéficiaire et de l'assuré, l'organisme de rattachement, et la
// question de l'accident causé par un tiers qui la suit.
//
// Le simulateur est anonyme par construction : il ne connaît ni nom, ni NIR, ni
// adresse, ni organisme. Ces lignes existent pour que le compte de cases du
// formulaire soit complet — cf. `case-de-formulaire.ts` — mais leur origine
// `externe` les tient hors de la checklist : rien n'y change à l'écran.

import type { CaseDeFormulaire, Rubrique } from "../case-de-formulaire.ts";

/**
 * Bénéficiaire et assuré, sur les trois formulaires. Le référentiel
 * d'identification ne porte que des libellés de prescripteur : aucune de ces
 * données n'y est, et le pré-remplissage les laisse au prescripteur.
 *
 * Non exportée : `ACCIDENT_CAUSE_PAR_UN_TIERS`, juste en dessous, en est la
 * seule utilisatrice.
 */
const IDENTITE_BENEFICIAIRE_ET_ASSURE: readonly CaseDeFormulaire[] = [
  { id: "beneficiaire_nom_prenom", origine: "externe" },
  { id: "beneficiaire_nir", origine: "externe" },
  { id: "beneficiaire_naissance", origine: "externe" },
  { id: "beneficiaire_adresse", origine: "externe" },
  { id: "assure_nom_prenom", origine: "externe" },
  { id: "assure_nir", origine: "externe" },
];

/** L'organisme de rattachement, sur le PMT et la DAP seulement. */
export const ORGANISME: readonly CaseDeFormulaire[] = [
  { id: "organisme", origine: "externe" },
];

/**
 * En-tête des trois formulaires, sous le bloc assuré — même rubrique, même
 * intitulé partout. « Oui » et « Non » sont deux cases distinctes du Cerfa, et le
 * contrat de rendu interdit de cocher « Non » sur une question restée sans
 * réponse.
 */
export const ACCIDENT_CAUSE_PAR_UN_TIERS: Rubrique = {
  titre: "En-tête — accident causé par un tiers",
  icone: "fr-icon-alert-line",
  cases: [
    ...IDENTITE_BENEFICIAIRE_ET_ASSURE,
    {
      id: "tiers_oui",
      libelle: "Accident causé par un tiers : cocher « Oui ».",
      source: "cible_accident_cause_par_tiers",
    },
    {
      id: "tiers_non",
      libelle: "Accident causé par un tiers : cocher « Non ».",
      source: "cible_accident_cause_par_tiers",
      rendu: "case Non",
    },
    {
      id: "tiers_date",
      libelle: "Date de l’accident",
      source: "cible_date_accident_cause_par_tiers",
      rendu: "date",
      quand: { toutes: ["cible_accident_cause_par_tiers"] },
    },
  ],
};
