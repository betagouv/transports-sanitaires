// Les rubriques que les trois Cerfa partagent, recopiées du YAML documentaire de
// la v9.7. Le PMT, la DAP et le S3141 posent les mêmes questions d'en-tête, les
// mêmes modes de transport, le même trajet et la même exonération : le livrable
// répète ces champs à l'identique d'un formulaire à l'autre, ce fichier les nomme
// une fois. Leur numéro de rubrique, lui, change d'un formulaire à l'autre — il
// se déclare donc là où chaque formulaire s'assemble.
//
// Les libellés disent ce que porte le papier, pas ce que calcule la règle : le
// prescripteur lit cette liste en face du formulaire qu'il a sous les yeux.

import type { CaseDeFormulaire, Rubrique } from "./case-de-formulaire";

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

/**
 * Les modes de transport et leurs justifications. Deux avertissements du guide
 * s'y lisent en creux : « il n'existe pas de case générique Ambulance sur ces
 * trois formulaires » — l'ambulance se déclare par ses cinq justifications — et
 * le transport à mobilité réduite se coche **en plus** du transport assis
 * professionnalisé, non à sa place.
 */
export const MODE_DE_TRANSPORT: readonly CaseDeFormulaire[] = [
  {
    id: "mode_tap_ou_tpmr",
    libelle:
      "Transport assis professionnalisé — VSL (Véhicule Sanitaire Léger) ou taxi conventionné.",
    source: "cible_mode_tap_ou_tpmr",
  },
  {
    id: "fauteuil",
    libelle:
      "Transport d’un patient à mobilité réduite dans son fauteuil roulant.",
    source: "cible_fauteuil_roulant",
  },
  {
    id: "partage_incompatible",
    libelle: "État incompatible avec un transport partagé.",
    source: "cible_transport_partage_incompatible",
  },
  {
    id: "ambulance_position_allongee_demi_assise",
    libelle: "Ambulance : position allongée ou demi-assise.",
    source: "cible_ambulance_position_allongee_demi_assise",
  },
  {
    id: "ambulance_surveillance_constante",
    libelle: "Ambulance : surveillance par une personne qualifiée.",
    source: "cible_ambulance_surveillance_constante",
  },
  {
    id: "ambulance_oxygene",
    libelle: "Ambulance : administration d’oxygène.",
    source: "cible_ambulance_oxygene",
  },
  {
    id: "ambulance_brancardage_portage",
    libelle: "Ambulance : brancardage ou portage.",
    source: "cible_ambulance_brancardage_portage",
  },
  {
    id: "ambulance_isolement_asepsie",
    libelle: "Ambulance : conditions d’asepsie.",
    source: "cible_ambulance_isolement_asepsie",
  },
  {
    id: "mode_individual",
    libelle: "Moyen de transport individuel.",
    source: "cible_mode_individual",
  },
  {
    id: "mode_public",
    libelle: "Transport en commun terrestre.",
    source: "cible_mode_public",
  },
  // L'accolade du Cerfa réunit le moyen individuel et le transport en commun :
  // la personne accompagnante ne se coche que sous l'un des deux.
  {
    id: "accompagnant",
    libelle: "Personne accompagnante.",
    source: "cible_personne_accompagnante",
    quand: { une: ["cible_mode_individual", "cible_mode_public"] },
  },
];

/**
 * Le trajet, aux mêmes trois familles de lieux sur les trois formulaires. Seul
 * le domicile a une case ; « structure de soins » et « autre lieu » désignent
 * des lignes où écrire le nom et l'adresse, et le livrable prévient : « ne jamais
 * dessiner de coche ». L'adresse elle-même relève du pré-remplissage.
 */
export const TRAJET: readonly CaseDeFormulaire[] = [
  {
    id: "depart_domicile",
    libelle: "Départ : cocher « domicile ».",
    source: "cible_lieu_depart_type",
    rendu: "ligne",
    quand: { regle: "cible_lieu_depart_type", parmi: ["Domicile"] },
  },
  {
    id: "depart_structure",
    libelle: "Départ : nom et adresse sur la ligne « structure de soins ».",
    source: "cible_lieu_depart_type",
    rendu: "ligne",
    quand: {
      regle: "cible_lieu_depart_type",
      parmi: ["Structure de soins", "USLD"],
    },
  },
  {
    id: "depart_autre",
    libelle: "Départ : nom et adresse sur la ligne « autre lieu ».",
    source: "cible_lieu_depart_type",
    rendu: "ligne",
    quand: {
      regle: "cible_lieu_depart_type",
      parmi: ["EHPAD", "Autre lieu", "Établissement pénitentiaire"],
    },
  },
  {
    id: "arrivee_domicile",
    libelle: "Arrivée : cocher « domicile ».",
    source: "cible_lieu_arrivee_type",
    rendu: "ligne",
    quand: { regle: "cible_lieu_arrivee_type", parmi: ["Domicile"] },
  },
  {
    id: "arrivee_structure",
    libelle: "Arrivée : nom et adresse sur la ligne « structure de soins ».",
    source: "cible_lieu_arrivee_type",
    rendu: "ligne",
    quand: {
      regle: "cible_lieu_arrivee_type",
      parmi: ["Structure de soins", "USLD"],
    },
  },
  {
    id: "arrivee_autre",
    libelle: "Arrivée : nom et adresse sur la ligne « autre lieu ».",
    source: "cible_lieu_arrivee_type",
    rendu: "ligne",
    quand: {
      regle: "cible_lieu_arrivee_type",
      parmi: ["EHPAD", "Autre lieu", "Établissement pénitentiaire"],
    },
  },
  {
    id: "aller_retour",
    libelle: "Transport aller-retour.",
    source: "cible_case_aller_retour",
  },
];

/**
 * L'urgence, sur le PMT et la DAP seulement : « aucune rubrique éléments
 * médicaux, urgence ou centre de référence sur S3141 ».
 */
export const URGENCE: readonly CaseDeFormulaire[] = [
  {
    id: "urgence_appel15",
    libelle: "Urgence : appel du SAMU — centre 15.",
    source: "cible_urgence_appel15",
  },
  {
    id: "urgence_autre",
    libelle: "Urgence : autre urgence médicale attestée.",
    source: "cible_urgence_autre",
  },
  {
    id: "urgence_precision",
    libelle: "Nature de l’urgence",
    source: "cible_urgence_autre_precision",
    rendu: "texte",
    quand: { toutes: ["cible_urgence_autre"] },
  },
];

/**
 * Le volet médical du PMT et de la DAP. Le livrable insiste : « volet 1
 * exclusivement, aucune copie » sur les volets suivants. Les éléments d'ordre
 * médical eux-mêmes restent à la main du prescripteur.
 */
export const VOLET_MEDICAL: readonly CaseDeFormulaire[] = [
  {
    id: "centre_rare",
    libelle:
      "Transport vers un autre centre de référence dédié aux maladies rares.",
    source: "cible_situation_centre_reference_maladies_rares",
  },
];

/** Rubrique ④ ou ⑥ selon le formulaire, mais les mêmes deux cases partout. */
export const EXONERATION_DU_TICKET_MODERATEUR: readonly CaseDeFormulaire[] = [
  {
    id: "exoneration_oui",
    libelle:
      "Cas particulier d’exonération du ticket modérateur : cocher « Oui ».",
    source: "cible_exoneration_ticket_moderateur",
  },
  {
    id: "exoneration_non",
    libelle:
      "Cas particulier d’exonération du ticket modérateur : cocher « Non ».",
    source: "cible_exoneration_ticket_moderateur",
    rendu: "case Non",
  },
];
