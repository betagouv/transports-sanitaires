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
  "cible_accident_cause_par_tiers",
  "cible_accompagnant_necessaire",
  "cible_ald_exonerante",
  "cible_ald_non_exonerante",
  // Les cinq justifications de l'ambulance. Le modèle les compose lui-même
  // depuis la v9.7 — critère médical **et** mode ambulance — parce qu'il n'existe
  // pas de case « Ambulance » sur les trois Cerfa : elle se déclare par elles.
  "cible_ambulance_brancardage_portage",
  "cible_ambulance_isolement_asepsie",
  "cible_ambulance_oxygene",
  "cible_ambulance_position_allongee_demi_assise",
  "cible_ambulance_surveillance_constante",
  "cible_attente_accord_prealable_requise",
  "cible_avion_bateau_accompagnant",
  "cible_case_aller_retour",
  "cible_cas_final",
  "cible_convocation_type",
  "cible_dap_motif_avion_bateau",
  "cible_dap_motif_camsp_cmpp",
  "cible_dap_motif_engagement_maternite",
  "cible_dap_motif_longue_distance",
  "cible_dap_motif_samsah",
  "cible_dap_motif_serie",
  "cible_date_accident_cause_par_tiers",
  "cible_date_at_mp",
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
  "cible_exoneration_ticket_moderateur",
  "cible_fauteuil_roulant",
  "cible_justification_longue_distance",
  "cible_lieu_arrivee_type",
  "cible_lieu_depart_type",
  "cible_mode_individual",
  "cible_mode_public",
  "cible_mode_tap_ou_tpmr",
  "cible_motif_medical_deplacement",
  "cible_nombre_transports_document",
  "cible_nombre_transports_prevus",
  "cible_partie_2_requise",
  "cible_personne_accompagnante",
  "cible_regime_financement",
  "cible_resultat_1_couleur",
  "cible_resultat_2_affichable",
  "cible_resultat_2_couleur",
  "cible_resultat_medical",
  // Les trois sorties propres au S3141 : la date qui ouvre la période, la
  // fréquence mensuelle des trajets et la date jusqu'à laquelle les permissions
  // sont prescrites.
  "cible_s3141_debut_hospitalisation",
  "cible_s3141_nombre_trajets_mois",
  "cible_s3141_periode_fin",
  "cible_situation_ald",
  "cible_situation_at_mp",
  "cible_situation_centre_reference_maladies_rares",
  "cible_situation_hospitalisation",
  "cible_situation_pension_militaire",
  "cible_transport_partage_applicable",
  "cible_transport_partage_incompatible",
  "cible_transport_sanitaire_prescrit",
  "cible_type_urgence",
  "cible_urgence_appel15",
  "cible_urgence_attestee",
  "cible_urgence_autre",
  "cible_urgence_autre_precision",
] as const;

/**
 * Les questions du modèle : celles que le prescripteur répond. Ce sont elles qui
 * composent les situations — base neutre, seeds, pré-remplissage du CERFA.
 *
 * Le contrat d'interface les désigne par `owner: prescripteur`, et c'est la
 * frontière qui compte : une entrée que l'application calcule n'a rien à faire
 * ici, sans quoi une seed pourrait prétendre y répondre.
 */
export const QUESTIONS = [
  "p1_autonomie",
  "p1_critere_aide_professionnel",
  "p1_critere_aide_technique",
  "p1_critere_aucun",
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
  "p1_m0_seance_chimiotherapie",
  "p1_m0_seance_dialyse_centre",
  "p1_m0_seance_radiotherapie",
  "p1_mode_non_professionnalise",
  "p1_transport_partage_incompatible",
  "p1_type_ald",

  "p2_accident_cause_par_tiers",
  "p2_arrivee_adresse",
  "p2_arrivee_code_postal",
  "p2_arrivee_commune",
  "p2_arrivee_complement_adresse",
  "p2_arrivee_nom_lieu",
  "p2_arrivee_pays",
  "p2_contexte_at_mp",
  "p2_contexte_aucun",
  "p2_contexte_centre_reference",
  "p2_contexte_engagement_maternite",
  "p2_contexte_pension_militaire",
  "p2_contexte_retour_penitentiaire",
  "p2_convocation_aucune",
  "p2_convocation_avion_bateau",
  "p2_convocation_ou_avis_type",
  "p2_convocation_plus_150km",
  "p2_date_accident_cause_par_tiers",
  "p2_date_at_mp",
  "p2_depart_adresse",
  "p2_depart_code_postal",
  "p2_depart_commune",
  "p2_depart_complement_adresse",
  "p2_depart_nom_lieu",
  "p2_depart_pays",
  "p2_exception_admission_had",
  "p2_exception_aide_medicale_urgente",
  "p2_exception_aucune",
  "p2_exception_avion_bateau",
  "p2_exception_dialyse_domicile",
  "p2_exception_ehpad",
  "p2_exception_had_hors_protocole",
  "p2_exception_radiotherapie_moins_48h",
  "p2_exception_retour_penitentiaire",
  "p2_exception_usld",
  "p2_htnm_adresse",
  "p2_htnm_lieu",
  "p2_htnm_nom",
  "p2_justification_longue_distance",
  "p2_maternite_adresse",
  "p2_maternite_lieu",
  "p2_maternite_niveau",
  "p2_maternite_nom",
  "p2_motif_detail",
  "p2_nature_transfert",
  "p2_nombre_transports_couvert_simulation",
  "p2_nombre_transports_permission_dap",
  "p2_nombre_transports_prevus",
  "p2_organisation_transports",
  "p2_patient_moins_16_ans",
  "p2_permission_age",
  "p2_permission_ar_par_mois",
  "p2_permission_cadre",
  "p2_permission_debut",
  "p2_permission_debut_hospitalisation",
  "p2_permission_fin",
  "p2_permission_periode_fin",
  "p2_raison_principale",
  "p2_special_aucune",
  "p2_special_avion_bateau",
  "p2_special_camsp_cmpp",
  "p2_special_samsah",
  "p2_tm_dap_acte",
  "p2_tm_dap_adapte",
  "p2_tm_dap_aucun",
  "p2_tm_dap_consecutif",
  "p2_tm_dap_nouveau_ne",
  "p2_tm_pmt_acte",
  "p2_tm_pmt_aucun",
  "p2_tm_pmt_consecutif",
  "p2_tm_pmt_had",
  "p2_tm_pmt_nouveau_ne",
  "p2_tm_pmt_urgence",
  "p2_tm_s3141_acte",
  "p2_tm_s3141_aucun",
  "p2_tm_s3141_consecutif",
  "p2_tm_s3141_had",
  "p2_tm_s3141_nouveau_ne",
  "p2_tm_s3141_urgence",
  "p2_trajet_arrivee",
  "p2_trajet_depart",
  "p2_tranche_distance_trajet_aller",
  "p2_transfert_en_cours",
  "p2_transfert_motif_detail",
  "p2_transport_urgence",
  "p2_urgence_autre_precision",
] as const;

/**
 * Les entrées que **l'application** calcule et verse au modèle : dates et
 * durées d'une permission, validité des formats et des lieux, cohérence des
 * déclarations et des exceptions de trajet. Le contrat d'interface les marque
 * `owner: application`. Leur nom commence par
 * `p1_` ou `p2_` comme celui d'une question, mais elles n'en sont pas une : les
 * poser au prescripteur reviendrait à lui demander de faire le calcul. Les tenir
 * dans une liste à part est ce qui empêche qu'un écran les affiche.
 */
export const ENTREES_CALCULEES = [
  "p0_date_reference_yyyymmdd",
  "p1_verrou_medical_valide",
  "p2_adresses_strictement_identiques",
  "p2_arrivee_format_valide",
  "p2_depart_format_valide",
  "p2_exceptions_trajet_valides",
  "p2_nombre_permission_dap_valide",
  "p2_permission_calendrier_valide",
  "p2_permission_dates_valides",
  "p2_permission_duree_heures",
  "p2_permission_rang_jour",
  "p2_qualification_declarations_valides",
  "p2_types_lieux_valides",
  "p2_validations_documentaires",
] as const;

/**
 * Règles intermédiaires que le code **lit sans jamais les écrire**. Ni questions
 * — on ne les répond pas —, ni sorties du produit — on ne les affiche pas : ce
 * sont des garde-fous que le modèle calcule et dont l'interface se sert pour
 * savoir ce qu'elle a le droit de faire. Les tenir à part des `QUESTIONS`
 * empêche qu'une situation prétende les renseigner.
 *
 * La plupart sont les règles de complétude des étapes (`etapes.ts`) : une
 * étape est complète quand elles le disent, pas quand ses champs ont répondu.
 */
export const REGLES_LUES = [
  // Une ALD reconnue *et* assortie d'une incapacité ou d'une déficience. Les
  // trois Cerfa s'y réfèrent : leurs cases ALD ne s'ouvrent qu'à cette
  // condition, une ALD déclarée seule n'ayant rien à y faire.
  "p1_ald_validee",
  "p1_cas_particuliers_medicaux_complet",
  "p1_criteres_transport_complet",
  "p2_adresse_arrivee_obligatoire_complete",
  "p2_adresse_depart_obligatoire_complete",
  "p2_contextes_complementaires_complet",
  "p2_convocation_caracteristiques_complet",
  "p2_exceptions_assurance_maladie_complet",
  "p2_nombre_permission_dap_complet",
  // Lue par les éléments d'ordre médical (spec 0005), jamais posée.
  "p2_permission_speciale",
  "p2_situations_speciales_complet",
  "p2_tm_dap_complet",
  "p2_tm_pmt_complet",
  "p2_tm_s3141_complet",
  // Le transport en série au sens de la notice : quatre trajets ou plus sur deux
  // mois, chacun à plus de 50 km. Le CERFA en a besoin pour *ne pas* remplir la
  // rubrique des transports itératifs, qu'elle lui réserve.
  "p2_transport_en_serie",
  // Lue pour adapter deux libellés à la convocation (`label_when` du contrat
  // d'interface v9.7.1), pas pour décider du parcours : `etapes.ts` s'en tient
  // à `p2_convocation_caracteristiques_complet`.
  "p2_convocation",
] as const;

export type Cible = (typeof CIBLES)[number];
type Question = (typeof QUESTIONS)[number];
type EntreeCalculee = (typeof ENTREES_CALCULEES)[number];
type RegleLue = (typeof REGLES_LUES)[number];

/** Toute clé du modèle que le code a le droit de nommer. */
export type CleDeRegle = Cible | Question | EntreeCalculee | RegleLue;

/**
 * Une situation publicodes dont les clés sont vérifiées à la compilation. Elle
 * porte les réponses du prescripteur **et** les entrées que l'application
 * calcule : les deux sont écrites, et le moteur ne les distingue pas.
 */
export type SituationTypee = Partial<Record<Question | EntreeCalculee, string>>;
