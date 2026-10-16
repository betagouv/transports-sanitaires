// Les questions du modèle, sous l'identifiant que l'éditeur leur donne, et le
// type de la réponse de chacune.
//
// Une option se répond par un slug : son numéro dans le catalogue de l'éditeur,
// puis ce qu'elle veut dire. Le libellé est celui du catalogue, mot pour mot.
// Les options se déclarent dans l'ordre du catalogue : c'est l'ordre de l'écran,
// sauf quand le catalogue en donne un autre (Q1.3).

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
      "Nécessite l’intervention d’un professionnel ou des conditions particulières pendant le transport ; les besoins précis sont sélectionnés à la question suivante.",
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
      "Nécessite des précautions d’hygiène ou la désinfection du véhicule pour prévenir un risque infectieux, sans exigence de transport en conditions d’asepsie.",
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
      "L’état de santé du patient impose un transport dans des conditions d’asepsie.",
  },
  /** Les cas particuliers concernant le patient. */
  "Q1.3": {
    "1_FORTE_CORPULENCE": "Présente une forte corpulence (plus de 150 kg).",
    "2_ALD":
      "Les soins ou examens à l’origine du déplacement sont en lien avec une ALD reconnue (prise en charge à 100 % au titre de cette ALD).",
    "3_CHIMIOTHERAPIE": "Ce déplacement concerne une séance de chimiothérapie.",
    "4_RADIOTHERAPIE": "Ce déplacement concerne une séance de radiothérapie.",
    "5_DIALYSE": "Ce déplacement concerne une séance de dialyse en centre.",
    "6_PARTAGE_INCOMPATIBLE":
      "L’état de santé du patient n’est pas compatible avec un transport partagé.",
    "7_AUCUNE": "Aucune de ces situations.",
    "8_MINEUR_SOINS_CONTINUS":
      "Le patient a moins de 18 ans et le service médical de l’Assurance Maladie a reconnu qu’il nécessite des soins continus pendant plus de six mois, en lien avec ce déplacement.",
  },
  /** La séance prévue est-elle une séance d’hémodialyse ? */
  "Q1.3.a": {
    "1_OUI": "Oui",
    "2_AUTRE_DIALYSE": "Non, il s’agit d’une autre dialyse en centre",
    "3_NE_SAIT_PAS": "Je ne peux pas le préciser",
  },
  /** La préférence du patient en matière de transport. */
  "Q1.4": {
    "1_VEHICULE_PERSONNEL": "Véhicule personnel.",
    "2_TRANSPORTS_EN_COMMUN": "Transports en commun terrestres.",
  },
  /** Quelle situation médicale ou quel événement motive ce déplacement ? */
  "Q2.1": {
    "1_CONSULTATION":
      "Consultation médicale de diagnostic, de traitement ou de suivi, dont suivi de l’ALD.",
    "2_DENTISTE_OU_SAGE_FEMME":
      "Consultation ou soin réalisé par un chirurgien-dentiste ou une sage-femme.",
    "3_IMAGERIE": "Examen d’imagerie ou autre acte médical technique.",
    "4_BIOLOGIE": "Analyse ou examen de biologie médicale.",
    "5_PARAMEDICAL":
      "Rééducation, orthophonie, soins infirmiers ou autre soin paramédical.",
    "6_SEANCE": "Chimiothérapie, radiothérapie ou dialyse.",
    "7_PSYCHOLOGUE": "Séance de psychologue ou dispositif particulier.",
    "8_HOSPITALISATION":
      "Entrée ou sortie d’hospitalisation, ou admission en HAD.",
    "9_TRANSFERT":
      "Transfert entre établissements, ou déplacement pour soin pendant l’hospitalisation.",
    "10_CAMSP":
      "Soin CAMSP/CMPP, y compris séance en ville organisée dans le parcours de l’enfant.",
    "11_PERMISSION": "Permission temporaire pendant l’hospitalisation.",
    "12_CONVOCATION":
      "Convocation, expertise, audience ou déplacement chez un fournisseur d’appareillage.",
    "13_MATERNITE":
      "Trajet vers un hébergement près d’une maternité dans l’Engagement maternité.",
    "14_AUTRE": "Autre soin, examen ou séjour.",
    "15_AUCUN": "Aucun de ces soins ou événements.",
  },
  /** Les séances sélectionnées motivent-elles le même déplacement ? */
  "Q2.1.f": {
    "1_OUI": "Oui, il s’agit du même déplacement et du même lieu",
    "2_NON": "Non, il s’agit de déplacements ou de lieux différents",
  },
  /** Entrée, sortie ou admission en HAD ? */
  "Q2.1.g": {
    "1_ENTREE": "Une entrée dans un établissement de santé",
    "2_SORTIE": "Une sortie de cet établissement",
    "3_ADMISSION_HAD": "Une admission en HAD à domicile",
  },
  /** La séance est-elle organisée dans le parcours de l’enfant ? */
  "Q2.1.h": {
    "1_OUI": "Oui",
    "2_NON": "Non",
    "3_NE_SAIT_PAS": "Je ne peux pas le préciser",
  },
  /** L’une de ces situations correspond-elle aussi au trajet à réaliser ? */
  "Q2.2.1": {
    "1_HOSPITALISATION":
      "Le patient est déjà hospitalisé pendant ce trajet, y compris en hospitalisation à domicile (HAD).",
    "2_ETRANGER":
      "Le départ, l’arrivée ou le lieu de soins concerné se trouve à l’étranger.",
    "3_AUTRE_CADRE": "Une autre situation particulière concerne ce trajet.",
    "4_AUCUNE": "Aucune de ces situations.",
  },
  /** Ce trajet correspond-il à une permission temporaire de sortie de l’hôpital ? */
  "Q2.2.1.a": {
    "1_OUI": "Oui, il s'agit d'une permission de sortie.",
    "2_NON":
      "Non, ce déplacement a lieu pendant l'hospitalisation sans être une permission.",
  },
  /**
   * Laquelle ou lesquelles de ces situations concernent aussi ce trajet ? Les
   * options gardent leur numéro parmi les treize du catalogue (S1).
   */
  "Q2.2.1.b": {
    "1_ATMP": "À un accident du travail ou à une maladie professionnelle.",
    "4_MATERNITE_ELOIGNEE": "À un séjour près d’une maternité éloignée.",
    "5_HTNM":
      "À un hébergement temporaire non médicalisé en lien avec les soins.",
    "6_CAMSP":
      "À des soins dans le cadre d’un CAMSP ou d’un CMPP, y compris une séance en ville organisée dans le parcours de l’enfant.",
    "7_SAMSAH": "À des soins dans un SAMSAH.",
    "8_CENTRE_DE_REFERENCE":
      "À une consultation ou à des soins dans un centre de référence pour une maladie rare.",
    "9_PENSION_MILITAIRE":
      "À des soins en rapport avec une pension militaire d’invalidité.",
    "10_RETOUR_PENITENTIAIRE":
      "À un retour vers un établissement pénitentiaire.",
    "13_CONVOCATION":
      "À une convocation de contrôle, une expertise ou un rendez-vous chez un fournisseur d’appareillage.",
  },
  /** Quel lieu lié à ce transport se trouve à l’étranger ? */
  "Q2.2.5": {
    "1_DEPART": "Le départ.",
    "2_ARRIVEE": "L’arrivée.",
    "3_LIEU_DES_SOINS":
      "Le lieu des soins, s’il est distinct du départ et de l’arrivée.",
  },
  /** Quelle distance parcourra le patient pour le trajet dans le sens évalué ? */
  "Q2.3.1": {
    "1_CINQUANTE_KM_OU_MOINS": "50 km ou moins.",
    "2_PLUS_DE_CINQUANTE_KM": "Plus de 50 km, jusqu’à 150 km inclus.",
    "3_PLUS_DE_CENT_CINQUANTE_KM": "Plus de 150 km.",
  },
  /** Au moins quatre transports de plus de 50 km, en deux mois, pour le même traitement ? */
  "Q2.3.3": {
    "1_OUI": "Oui.",
    "2_NON": "Non.",
  },
  /** Le médecin prescripteur atteste-t-il que ce transport est urgent ? */
  "Q2.3.4": {
    "1_OUI": "Oui.",
    "2_NON": "Non.",
  },
} as const;

type Option<Id extends keyof typeof OPTIONS> = keyof (typeof OPTIONS)[Id];

export type Questions = {
  "Q0.1": Option<"Q0.1">;
  "Q1.1": Option<"Q1.1">;
  "Q1.2": readonly Option<"Q1.2">[];
  "Q1.3": readonly Option<"Q1.3">[];
  "Q1.3.a": Option<"Q1.3.a">;
  "Q1.4": Option<"Q1.4">;
  "Q2.1": Option<"Q2.1">;
  "Q2.1.f": Option<"Q2.1.f">;
  "Q2.1.g": Option<"Q2.1.g">;
  "Q2.1.h": Option<"Q2.1.h">;
  "Q2.2.1": readonly Option<"Q2.2.1">[];
  "Q2.2.1.a": Option<"Q2.2.1.a">;
  "Q2.2.1.b": readonly Option<"Q2.2.1.b">[];
  "Q2.2.5": readonly Option<"Q2.2.5">[];
  "Q2.3.1": Option<"Q2.3.1">;
  "Q2.3.2": boolean;
  "Q2.3.3": Option<"Q2.3.3">;
  "Q2.3.4": Option<"Q2.3.4">;
};
