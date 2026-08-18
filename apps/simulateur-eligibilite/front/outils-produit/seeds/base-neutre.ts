// Base neutre « tout à non » : chaque question du modèle répondue par sa valeur
// la plus banale. C'est le **fond de carte** des seeds — une seed ne déclare que
// ce qui la distingue (`entrees`), le reste vient d'ici.
//
// Sans cette base, chaque situation devrait répéter la trentaine de réponses du
// questionnaire, et l'ajout d'une question au modèle obligerait à toutes les
// reprendre. Elle sert aussi de garantie : une situation construite sur elle
// n'a aucune variable manquante, donc toutes les cibles s'évaluent.
//
// Formats de valeurs publicodes : booléens `oui`/`non`, énumérés entre quotes
// simples, nombres tels quels.
export const BASE_NEUTRE: Record<string, string> = {
  p1_situation_smur: "non",
  p1_situation_bariatrique_seul: "non",
  // « Non concerné » = aucune permission de sortie en jeu. « Non » signifierait
  // qu'une permission **est** en jeu mais avec motif médical — ce qui fait basculer
  // `cible_article_80_permission_sortie_therapeutique` à vrai sur les cas à la
  // charge de l'établissement. Une base neutre ne doit rien affirmer de tel.
  p1_situation_permission_sans_motif_medical: "'Non concerné'",
  p1_motif_hospitalisation: "non",
  p1_motif_seance_chimio_radio_hemodialyse: "non",
  p1_motif_ald: "non",
  p1_ald_lien_avec_ald_reconnue: "non",
  p1_ald_seance_specifique: "non",
  p1_motif_accident_travail_maladie_professionnelle: "non",
  p1_motif_retour_etablissement_penitentiaire: "non",
  p1_motif_aucun: "non",
  p1_autonomie: "'Aucune de ces situations.'",
  p1_critere_regles_hygiene: "non",
  p1_critere_risques_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "non",
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_personne_qualifiee: "non",
  p1_critere_oxygene: "non",
  p1_critere_asepsie: "non",
  p1_critere_aucune_situation_encadree: "non",
  p2_patient_hospitalise: "non",
  p2_exception_type:
    "'Non, le transport ne fait pas partie de ces exceptions.'",
  p2_detenu_hospitalise: "non",
  p2_detenu_inter_etablissements: "non",
  p2_detenu_uhsa_uhsi: "non",
  p2_detenu_retour_etablissement_penitentiaire: "non",
  p2_convocation_ou_avis: "non",
  // v8.10 : A2.3 applicable en base neutre → répondue « oui » (parcours standard).
  p2_prestation_prise_en_charge_assurance_maladie: "oui",
  p2_distance_aller_superieure_150km: "non",
  p2_chaque_trajet_aller_superieur_50km: "non",
  p2_avion_ou_bateau: "non",
  p2_camsp_cmpp: "non",
  p2_maternite_eloignee: "non",
  p2_samsah: "non",
  p2_accompagnement_tiers: "non",
  p2_trajet_aller_retour: "'Aller simple'",
  p2_trajet_depart: "'Domicile'",
  p2_trajet_arrivee: "'Structure de soins'",
  p2_nombre_transports_prevus: "1",
  p2_transport_urgence: "'Non'",
  p2_accident_cause_par_tiers: "'Non'",
  p2_convocation_ou_avis_type: "'Convocation du contrôle médical.'",
};
