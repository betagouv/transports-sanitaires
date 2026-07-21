// Raccourcis dev : situations type pré-remplies pour ouvrir directement une page
// de résultat sans passer par le parcours. Utilisées uniquement en dev (voir
// `accesDirectDev` dans App.tsx, gardé derrière `import.meta.env.DEV`).
//
// Les deux premières variantes ouvrent la Page Résultat 1 (prescripteur,
// situation de Partie 1) ; les deux dernières ouvrent directement la Page
// Résultat 2 finale (secrétariat, situation complète P1 + P2).

import type { Situation } from "publicodes";
import type { Outil } from "./App";

export type VarianteDev = "favorable" | "defavorable" | "final-succes" | "final-refus";

// Cas favorable riche : motif hospitalisation + critère « position allongée »
// (⇒ ambulance). Ouvre directement le résultat prescripteur avec critères et
// motifs retenus renseignés.
const SITUATION_DEMO_DEV_FAVORABLE: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'Non'",
  p1_motif_hospitalisation: "oui",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "non",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "oui",
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "non",
};

// Cas défavorable : aucun motif ouvrant droit et aucune situation encadrée
// (⇒ transport non justifié médicalement).
const SITUATION_DEMO_DEV_DEFAVORABLE: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'Non'",
  p1_motif_hospitalisation: "non",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "non",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "oui",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "non",
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "oui",
};

// Page Résultat 2 finale, cas succès : P1 favorable (motif ALD validé + critère
// « position allongée » ⇒ ambulance) puis P2 complète menant à cas_final =
// « prescription médicale de transport ».
const SITUATION_DEMO_DEV_FINAL_SUCCES: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'Non'",
  p1_motif_hospitalisation: "non",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "oui",
  p1_ald_lien_avec_ald_reconnue: "oui",
  p1_ald_seance_specifique: "non",
  p1_ald_incapacite_ou_deficience: "oui",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "oui",
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "non",
  p2_patient_hospitalise: "non",
  p2_convocation_ou_avis: "non",
  p2_distance_aller_superieure_150km: "non",
  p2_transport_en_serie: "oui",
  p2_avion_ou_bateau: "non",
  p2_camsp_cmpp: "non",
  p2_maternite_eloignee: "non",
  p2_samsah: "non",
  p2_accompagnement_tiers: "non",
  p2_trajet_aller_retour: "'Aller simple'",
  p2_trajet_depart: "'Domicile'",
  p2_trajet_arrivee: "'Structure de soins'",
  p2_nombre_transports_prevus: "4",
  p2_transport_urgence: "'Non'",
  p2_accident_cause_par_tiers: "'Non'",
};

// Page Résultat 2 finale, cas refus : même P1 favorable (⇒ ambulance) puis P2
// (patient détenu hospitalisé, hors exceptions) menant à cas_final =
// « non éligible assurance maladie dans ce parcours ».
const SITUATION_DEMO_DEV_FINAL_REFUS: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'Non'",
  p1_motif_hospitalisation: "non",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "oui",
  p1_ald_lien_avec_ald_reconnue: "oui",
  p1_ald_seance_specifique: "non",
  p1_ald_incapacite_ou_deficience: "oui",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "oui",
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "non",
  p2_patient_hospitalise: "oui",
  // v8.9 : `p2_exception_restant_assurance_maladie` est désormais dérivé du type
  // d'exception A0.2-A0.3 ; on ne renseigne plus que ce dernier.
  p2_exception_type: "'Retour en HAD (Hospitalisation À Domicile).'",
  p2_detenu_hospitalise: "oui",
  p2_detenu_inter_etablissements: "non",
  p2_detenu_uhsa_uhsi: "non",
  p2_detenu_retour_etablissement_penitentiaire: "non",
};

export const SITUATIONS_DEMO_DEV: Record<VarianteDev, Situation<string>> = {
  favorable: SITUATION_DEMO_DEV_FAVORABLE,
  defavorable: SITUATION_DEMO_DEV_DEFAVORABLE,
  "final-succes": SITUATION_DEMO_DEV_FINAL_SUCCES,
  "final-refus": SITUATION_DEMO_DEV_FINAL_REFUS,
};

// Outil ciblé par chaque raccourci dev : résultat médical (prescripteur) pour les
// variantes P1, résultat final (secrétariat) pour les variantes P2.
export const OUTIL_DEV: Record<VarianteDev, Outil> = {
  favorable: "prescripteur",
  defavorable: "prescripteur",
  "final-succes": "secretariat",
  "final-refus": "secretariat",
};
