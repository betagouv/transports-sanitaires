// Les modes de transport et leurs justifications, recopiés du YAML documentaire
// de la v9.7. Communs aux trois formulaires.
//
// Deux avertissements du guide s'y lisent en creux : « il n'existe pas de case
// générique Ambulance sur ces trois formulaires » — l'ambulance se déclare par
// ses cinq justifications — et le transport à mobilité réduite se coche **en
// plus** du transport assis professionnalisé, non à sa place.

import type { CaseDeFormulaire } from "./case-de-formulaire.ts";

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
