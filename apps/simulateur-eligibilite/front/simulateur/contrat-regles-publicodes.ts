// Le contrat entre `regles/regles.publicodes` et le code qui le consomme.
//
// Le modèle est livré de l'extérieur et intégré par recopie ; le code, lui, y fait
// référence par des chaînes de caractères. Sans point de passage obligé, chacune de
// ces chaînes est un pari : `setSituation` et `evaluate` jettent sur une clé
// inconnue, et une clé renommée en amont ne se voit qu'à l'exécution, sur le seul
// parcours qui la traverse.
//
// Ce fichier est ce point de passage. Il déclare les noms, en dérive des types, et
// `tests/regles-front.test.ts` vérifie que chacun existe bien dans le modèle. Les
// deux ensemble ferment la boucle : le test dit que le contrat est honoré par les
// règles, TypeScript dit que le code est honoré par le contrat.
//
// Les chaînes restent écrites telles quelles aux points d'appel, plutôt que derrière
// des constantes : ce sont les noms du modèle, et les lire à l'identique dans le
// `.publicodes` et dans le code vaut mieux qu'un alias à traduire de tête. Ce qui
// change, c'est que la position où on les écrit est désormais typée.
//
// **Ajouter une clé ici est le geste qui autorise à l'employer** — pas l'inverse.

/** Les sorties du modèle : ce que le produit affiche ou décide. */
export const CIBLES = [
  "cible_accompagnant_necessaire",
  "cible_ald_non_retenue_absence_incapacite_deficience",
  "cible_article_80_mode",
  "cible_article_80_situation_specifique",
  "cible_cas_final",
  "cible_dap_motif_accompagnement_tiers",
  "cible_dap_motif_avion_bateau",
  "cible_dap_motif_camsp_cmpp",
  "cible_dap_motif_engagement_maternite",
  "cible_dap_motif_longue_distance",
  "cible_dap_motif_samsah",
  "cible_dap_motif_serie",
  "cible_document_a_remettre_au_patient",
  "cible_document_arrivee_adresse",
  "cible_document_arrivee_code_postal",
  "cible_document_arrivee_commune",
  "cible_document_arrivee_complement",
  "cible_document_arrivee_nom",
  "cible_document_arrivee_pays",
  "cible_document_depart_adresse",
  "cible_document_depart_code_postal",
  "cible_document_depart_commune",
  "cible_document_depart_complement",
  "cible_document_depart_nom",
  "cible_document_depart_pays",
  "cible_equipement_bariatrique_requis",
  "cible_partie_2_requise",
  "cible_regime_financement",
  "cible_resultat_medical",
  "cible_transport_partage_applicable",
  "cible_transport_partage_incompatible",
  "cible_transport_sanitaire_prescrit",
] as const;

/**
 * Les entrées du modèle citées par le code : questions du questionnaire et règles
 * intermédiaires servant de réponse. Ce sont elles qui composent les situations —
 * base neutre, seeds, pré-remplissage du CERFA.
 */
export const QUESTIONS = [
  "p1_autonomie",
  "p1_critere_aide_professionnel",
  "p1_critere_aide_technique",
  "p1_critere_ambulance",
  "p1_critere_brancardage_portage",
  "p1_critere_fauteuil_sans_transfert",
  "p1_critere_hygiene_desinfection",
  "p1_critere_incapacite_deplacement_autonome",
  "p1_critere_isolement_asepsie",
  "p1_critere_oxygene",
  "p1_critere_position_allongee_demi_assise",
  "p1_critere_risque_effets_secondaires",
  "p1_critere_surveillance_constante",
  "p1_m0_ald",
  "p1_m0_aucun",
  "p1_m0_bariatrique",
  "p1_m0_permission_sans_motif_medical",
  "p1_m0_seance",
  "p1_m0_smur",
  "p1_transport_partage_incompatible",

  "p2_accident_cause_par_tiers",
  "p2_accompagnement_tiers",
  "p2_arrivee_adresse",
  "p2_arrivee_code_postal",
  "p2_arrivee_commune",
  "p2_arrivee_complement_adresse",
  "p2_arrivee_nom_lieu",
  "p2_arrivee_pays",
  "p2_chaque_trajet_aller_superieur_50km",
  "p2_contexte_administratif",
  "p2_contexte_at_mp",
  "p2_contexte_aucun",
  "p2_contexte_hospitalisation",
  "p2_contexte_retour_penitentiaire",
  "p2_convocation_ou_avis",
  "p2_convocation_ou_avis_type",
  "p2_depart_adresse",
  "p2_depart_code_postal",
  "p2_depart_commune",
  "p2_depart_complement_adresse",
  "p2_depart_nom_lieu",
  "p2_depart_pays",
  "p2_detenu_hospitalise",
  "p2_detenu_inter_etablissements",
  "p2_detenu_uhsa_uhsi",
  "p2_distance_aller_superieure_150km",
  "p2_engagement_maternite_entree",
  "p2_exception_admission_had",
  "p2_exception_aide_medicale_urgente",
  "p2_exception_aucune",
  "p2_exception_avion_bateau",
  "p2_exception_dialyse_domicile",
  "p2_exception_ehpad",
  "p2_exception_had_hors_protocole",
  "p2_exception_permission_mineur",
  "p2_exception_radiotherapie_moins_48h",
  "p2_exception_usld",
  "p2_nombre_transports_prevus",
  "p2_patient_hospitalise",
  "p2_prestation_prise_en_charge_applicable",
  "p2_prestation_prise_en_charge_assurance_maladie",
  "p2_special_aucune",
  "p2_special_avion_bateau",
  "p2_special_camsp_cmpp",
  "p2_special_engagement_maternite",
  "p2_special_samsah",
  "p2_trajet_aller_retour",
  "p2_trajet_arrivee",
  "p2_trajet_depart",
  "p2_transport_en_serie",
  "p2_transport_serie_declenche_dap",
  "p2_transport_urgence",
] as const;

export type Cible = (typeof CIBLES)[number];
type Question = (typeof QUESTIONS)[number];

/** Toute clé du modèle que le code a le droit de nommer. */
export type CleDeRegle = Cible | Question;

/** Une situation publicodes dont les clés sont vérifiées à la compilation. */
export type SituationTypee = Partial<Record<Question, string>>;
