// Les libellés figés du contrat EM-2
// (`tmp/9.7.3/docs/CONTRAT-ELEMENTS-MEDICAUX.md`) : les onze besoins de
// transport et les trois séances. Mot pour mot, apostrophes typographiques
// comprises. Une évolution clinique impose de les revoir ici, une évolution
// du questionnaire ne les modifie pas d'elle-même (décision « Composition
// dans l'ordre » du contrat).
//
// Les types de clé sont dérivés du contrat de règles plutôt que recopiés : si
// un critère ou une séance disparaît du modèle, ce fichier cesse de compiler
// au lieu de composer un texte sur une règle qui n'existe plus.

import type { CleDeRegle } from "../../../../simulateur/contrat-regles-publicodes.ts";

export type CleDeCritereMedical = Exclude<
  Extract<CleDeRegle, `p1_critere_${string}`>,
  "p1_critere_aucun"
>;

/** Les onze besoins de transport de la mosaïque Q1.1, dans l'ordre du dictionnaire EM-2. */
export const CRITERES_MEDICAUX: Readonly<Record<CleDeCritereMedical, string>> =
  {
    p1_critere_incapacite_deplacement_autonome:
      "Ne peut pas se déplacer de manière autonome sur une longue distance, utiliser seul les transports en commun ou conduire un véhicule personnel en raison de sa pathologie, de son traitement ou d’un handicap.",
    p1_critere_aide_technique:
      "Nécessite une aide technique, telle qu’un fauteuil roulant, un déambulateur ou des béquilles, et une assistance pour monter dans le véhicule ou en descendre.",
    p1_critere_aide_professionnel:
      "Nécessite, en l’absence d’un proche accompagnant, l’aide d’un professionnel pour transmettre les informations nécessaires à l’équipe soignante.",
    p1_critere_hygiene_desinfection:
      "Nécessite le respect rigoureux de règles d’hygiène ou la désinfection du véhicule afin de prévenir un risque infectieux.",
    p1_critere_risque_effets_secondaires:
      "Présente un risque d’effets secondaires, de malaise ou de complications pendant le transport.",
    p1_critere_fauteuil_sans_transfert:
      "Le patient doit être transporté dans son fauteuil roulant, sans transfert vers un siège du véhicule.",
    p1_critere_position_allongee_demi_assise:
      "Doit être transporté en position allongée ou semi-assise sur un brancard, car son état ne lui permet pas de rester assis normalement pendant le transport.",
    p1_critere_brancardage_portage:
      "Nécessite un brancardage ou un portage, c’est-à-dire que le patient doit être soulevé et transporté par des professionnels, y compris sur une courte distance.",
    p1_critere_surveillance_constante:
      "Nécessite une surveillance constante par une personne qualifiée et la présence de matériel de secours pendant le transport, en raison d’un risque médical identifié de dégradation de son état.",
    p1_critere_oxygene:
      "Nécessite l’administration d’oxygène pendant le transport.",
    p1_critere_isolement_asepsie:
      "L’état du patient nécessite un transport dans des conditions d’asepsie.",
  };

type CleDeSeance = Extract<CleDeRegle, `p1_m0_seance_${string}`>;

/** Les trois séances, dans l'ordre du contrat — supprime un doublon strict avec le motif. */
export const SEANCES: ReadonlyArray<readonly [CleDeSeance, string]> = [
  ["p1_m0_seance_chimiotherapie", "Séance de chimiothérapie"],
  ["p1_m0_seance_radiotherapie", "Séance de radiothérapie"],
  [
    "p1_m0_seance_dialyse_centre",
    "Séance de dialyse en centre, notamment d’hémodialyse",
  ],
];
