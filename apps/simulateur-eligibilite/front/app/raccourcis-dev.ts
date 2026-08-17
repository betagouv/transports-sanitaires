// Raccourcis dev : situations type pré-remplies pour ouvrir directement une page
// de résultat sans passer par le parcours. Utilisées uniquement en dev (voir
// `accesDirectDev` dans App.tsx, gardé derrière `import.meta.env.DEV`).
//
// Les variantes `prescripteur-*` ouvrent la Page Résultat 1 (situation de Partie 1) ;
// les variantes `secretariat-*` ouvrent directement la Page Résultat 2 finale
// (situation complète P1 + P2).

import type { Situation } from "publicodes";
import type { Outil } from "./outil";

// Chaque variante est nommée « écran d'atterrissage » + « ce qu'on y voit », comme
// les boutons qu'elle sert : c'est l'écran qui distingue vraiment ces raccourcis,
// l'issue seule donnant des noms jumeaux (favorable / succès, défavorable / refus).
export type VarianteDev =
  | "prescripteur-ambulance"
  | "prescripteur-non-justifie"
  | "secretariat-prescription"
  | "secretariat-non-eligible";

// Cas favorable riche : motif hospitalisation + critère « position allongée »
// (⇒ ambulance). Ouvre directement le résultat prescripteur avec critères et
// motifs retenus renseignés.
const SITUATION_PRESCRIPTEUR_AMBULANCE: Situation<string> = {
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
const SITUATION_PRESCRIPTEUR_NON_JUSTIFIE: Situation<string> = {
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

// Page Résultat 2 finale, cas succès menant à cas_final = « prescription médicale
// de transport » — la seule variante dont le cas final propose le CERFA.
//
// Situation volontairement **chargée** : c'est elle que sert le raccourci « Aller à
// la génération du CERFA », et un CERFA presque vide n'apprend rien. Elle cumule
// donc tout ce que le simulateur sait déduire — deux motifs ouvrant droit, les cinq
// justifications d'ambulance, aller-retour, urgence, accident causé par un tiers,
// transport répété — pour que le document produit montre d'un coup d'œil l'étendue
// du pré-remplissage, et par contraste ce qui reste vierge.
//
// Elle évite en revanche tout ce qui basculerait sur un autre formulaire : les
// déclencheurs d'accord préalable (> 150 km, avion/bateau, CAMSP/CMPP, maternité
// éloignée, SAMSAH, accompagnement par un tiers) et le transport en série.
const SITUATION_SECRETARIAT_PRESCRIPTION: Situation<string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  p1_situation_permission_sans_motif_medical: "'Non'",
  // Deux motifs ouvrant droit cochés en même temps (choix multiple).
  p1_motif_hospitalisation: "oui",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "non",
  p1_motif_accident_travail_maladie_professionnelle: "oui",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  // Les cinq justifications d'ambulance du CERFA, toutes retenues.
  p1_critere_position_allongee_demi_assise: "oui",
  p1_critere_brancardage_portage: "oui",
  p1_critere_surveillance_personne_qualifiee: "oui",
  p1_critere_oxygene: "oui",
  p1_critere_asepsie: "oui",
  p1_critere_aucune_situation_encadree: "non",
  p2_patient_hospitalise: "non",
  p2_exception_type: "'Non, le transport ne fait pas partie de ces exceptions.'",
  p2_detenu_hospitalise: "non",
  p2_detenu_inter_etablissements: "non",
  p2_detenu_uhsa_uhsi: "non",
  p2_detenu_retour_etablissement_penitentiaire: "non",
  p2_convocation_ou_avis: "non",
  // v8.10 : A2.3 (prestation prise en charge) — répondue pour trancher le cas final.
  p2_prestation_prise_en_charge_assurance_maladie: "oui",
  p2_distance_aller_superieure_150km: "non",
  // Trois transports à moins de 50 km : répété, mais **pas** « en série » — la
  // notice réserve la case « transports itératifs » à ce cas précis.
  p2_chaque_trajet_aller_superieur_50km: "non",
  p2_avion_ou_bateau: "non",
  p2_camsp_cmpp: "non",
  p2_maternite_eloignee: "non",
  p2_samsah: "non",
  p2_accompagnement_tiers: "non",
  p2_trajet_aller_retour: "'Aller-retour'",
  p2_trajet_depart: "'Domicile'",
  p2_trajet_arrivee: "'Structure de soins'",
  p2_nombre_transports_prevus: "3",
  p2_transport_urgence: "'Appel SAMU - Centre 15'",
  p2_accident_cause_par_tiers: "'Oui, en rapport avec un accident causé par un tiers'",
  p2_convocation_ou_avis_type: "'Convocation du contrôle médical.'",
};

// Page Résultat 2 finale, cas refus : même P1 favorable (⇒ ambulance) puis P2
// (patient détenu hospitalisé, hors exceptions) menant à cas_final =
// « non éligible assurance maladie dans ce parcours ».
const SITUATION_SECRETARIAT_NON_ELIGIBLE: Situation<string> = {
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
  // v8.10 : A2.3 (prestation prise en charge) — répondue pour trancher le cas final.
  p2_prestation_prise_en_charge_assurance_maladie: "oui",
  // v8.9 : `p2_exception_restant_assurance_maladie` est désormais dérivé du type
  // d'exception A0.2-A0.3 ; on ne renseigne plus que ce dernier.
  p2_exception_type: "'Retour en HAD (Hospitalisation À Domicile).'",
  p2_detenu_hospitalise: "oui",
  p2_detenu_inter_etablissements: "non",
  p2_detenu_uhsa_uhsi: "non",
  p2_detenu_retour_etablissement_penitentiaire: "non",
};

export const SITUATIONS_DEV: Record<VarianteDev, Situation<string>> = {
  "prescripteur-ambulance": SITUATION_PRESCRIPTEUR_AMBULANCE,
  "prescripteur-non-justifie": SITUATION_PRESCRIPTEUR_NON_JUSTIFIE,
  "secretariat-prescription": SITUATION_SECRETARIAT_PRESCRIPTION,
  "secretariat-non-eligible": SITUATION_SECRETARIAT_NON_ELIGIBLE,
};

// Outil ciblé par chaque raccourci : résultat médical (prescripteur) pour les
// variantes P1, résultat final (secrétariat) pour les variantes P2. Redondant avec
// le préfixe du nom de variante, mais explicite et vérifié par le typage — plutôt
// que déduit d'une convention de nommage qu'un renommage casserait en silence.
export const OUTILS_DEV: Record<VarianteDev, Outil> = {
  "prescripteur-ambulance": "prescripteur",
  "prescripteur-non-justifie": "prescripteur",
  "secretariat-prescription": "secretariat",
  "secretariat-non-eligible": "secretariat",
};
