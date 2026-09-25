// Les étapes de la Partie 1, la décision médicale, dans l'ordre du contrat
// d'interface. `etapes.ts` les place en tête du parcours et y ajoute celles de
// la Partie 2.

import type { Etape } from "./etapes";

export const ETAPES_DE_LA_PARTIE_1: readonly Etape[] = [
  { id: "Q1", champs: ["p1_autonomie"] },
  {
    id: "p1_criteres_transport",
    livrable: "Q1.1",
    champs: [
      "p1_critere_incapacite_deplacement_autonome",
      "p1_critere_aide_technique",
      "p1_critere_aide_professionnel",
      "p1_critere_hygiene_desinfection",
      "p1_critere_risque_effets_secondaires",
      "p1_critere_fauteuil_sans_transfert",
      "p1_critere_position_allongee_demi_assise",
      "p1_critere_brancardage_portage",
      "p1_critere_surveillance_constante",
      "p1_critere_oxygene",
      "p1_critere_isolement_asepsie",
      "p1_critere_aucun",
    ],
    complet: "p1_criteres_transport_complet",
  },
  { id: "M4", champs: ["p1_transport_partage_incompatible"] },
  {
    id: "p1_cas_particuliers_medicaux",
    livrable: "M0",
    champs: [
      "p1_m0_bariatrique",
      "p1_m0_ald",
      "p1_m0_seance_chimiotherapie",
      "p1_m0_seance_radiotherapie",
      "p1_m0_seance_dialyse_centre",
      "p1_m0_aucun",
    ],
    complet: "p1_cas_particuliers_medicaux_complet",
  },
  { id: "p1_type_ald", champs: ["p1_type_ald"] },
  {
    id: "p1_mode_non_professionnalise",
    champs: ["p1_mode_non_professionnalise"],
  },
];
