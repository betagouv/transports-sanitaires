// Les questions du modèle, sous l'identifiant que l'éditeur leur donne, et le
// type de la réponse de chacune.
//
// Une option se répond par un slug : son numéro dans le catalogue de l'éditeur,
// puis ce qu'elle veut dire. Le libellé est celui du catalogue, mot pour mot.
// Les options se déclarent dans l'ordre du catalogue : c'est l'ordre de l'écran.

/** Les options de chaque question à choix : leur slug, et leur libellé. */
export const OPTIONS = {
  /** Quel est votre besoin ? */
  "Q0.1": {
    "1_VERIFIER": "Vérifier une éligibilité",
    "2_VERIFIER_ET_PRESCRIRE":
      "Vérifier et prescrire si la situation le permet",
  },
  /** Concernant son déplacement, le patient : */
  "Q1.1": {
    "1_SEUL":
      "Peut se déplacer seul, sans aide technique ou humaine et sans besoin particulier sur l’entièreté du trajet.",
    "2_AVEC_UN_PROCHE":
      "Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.",
    "3_AVEC_UN_PROFESSIONNEL":
      "Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.",
  },
  /** Quelles aides ou conditions particulières sont nécessaires pendant le transport ? */
  "Q1.2": {
    "1_PAS_AUTONOME":
      "Ne peut pas se déplacer de manière autonome sur une longue distance, utiliser seul les transports en commun ou conduire un véhicule personnel en raison de sa pathologie, de son traitement ou d’un handicap.",
    "2_AIDE_TECHNIQUE":
      "Nécessite une aide technique, telle qu’un fauteuil roulant, un déambulateur ou des béquilles, et une assistance pour monter dans le véhicule ou en descendre.",
    "3_TRANSMISSION_PAR_UN_PROFESSIONNEL":
      "Nécessite, en l’absence d’un proche accompagnant, l’aide d’un professionnel pour transmettre les informations nécessaires à l’équipe soignante.",
    "4_HYGIENE":
      "Nécessite le respect rigoureux de règles d’hygiène ou la désinfection du véhicule afin de prévenir un risque infectieux.",
    "5_RISQUE_DE_MALAISE":
      "Présente un risque d’effets secondaires, de malaise ou de complications pendant le transport.",
    "6_FAUTEUIL_SANS_TRANSFERT":
      "Le patient doit être transporté dans son fauteuil roulant, sans transfert vers un siège du véhicule.",
    "7_ALLONGE":
      "Doit être transporté en position allongée ou semi-assise sur un brancard, car son état ne lui permet pas de rester assis normalement pendant le transport.",
    "8_BRANCARDAGE":
      "Nécessite un brancardage ou un portage, c’est-à-dire que le patient doit être soulevé et transporté par des professionnels, y compris sur une courte distance.",
    "9_SURVEILLANCE":
      "Nécessite une surveillance constante par une personne qualifiée et la présence de matériel de secours pendant le transport, en raison d’un risque médical identifié de dégradation de son état.",
    "10_OXYGENE": "Nécessite l’administration d’oxygène pendant le transport.",
    "11_ASEPSIE":
      "L’état du patient nécessite un transport dans des conditions d’asepsie.",
  },
  /** Les cas particuliers concernant le patient. */
  "Q1.3": {
    "1_EQUIPEMENT_BARIATRIQUE":
      "La morphologie ou le poids du patient (plus de 150 kg) nécessite un véhicule disposant d’un équipement bariatrique adapté.",
    "2_ALD":
      "Les soins ou examens à l’origine du déplacement sont en lien avec une ALD (Affection de Longue Durée) reconnue pour ce patient par l’Assurance Maladie.",
    "3_CHIMIOTHERAPIE": "Séance de chimiothérapie.",
    "4_RADIOTHERAPIE": "Séance de radiothérapie.",
    "5_DIALYSE": "Séance de dialyse en centre, notamment d’hémodialyse.",
    "6_PARTAGE_INCOMPATIBLE":
      "L’état de santé du patient n’est pas compatible avec un transport partagé.",
    "7_AUCUNE": "Aucune de ces situations.",
  },
  /** La préférence du patient en matière de transport. */
  "Q1.4": {
    "1_VEHICULE_PERSONNEL": "Véhicule personnel.",
    "2_TRANSPORTS_EN_COMMUN": "Transports en commun terrestres.",
  },
} as const;

type Option<Id extends keyof typeof OPTIONS> = keyof (typeof OPTIONS)[Id];

export type Questions = {
  "Q0.1": Option<"Q0.1">;
  "Q1.1": Option<"Q1.1">;
  "Q1.2": readonly Option<"Q1.2">[];
  "Q1.3": readonly Option<"Q1.3">[];
  "Q1.4": Option<"Q1.4">;
};
