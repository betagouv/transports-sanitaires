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
  "cible_article_80_mode",
  "cible_article_80_permission_sortie_therapeutique",
  "cible_article_80_situation_specifique",
  "cible_autonomie_patient",
  "cible_cas_final",
  "cible_document_a_remettre_au_patient",
  "cible_partie_2_requise",
  "cible_regime_financement",
  "cible_resultat_medical",
  "cible_transport_partage_incompatible",
  "cible_transport_sanitaire_prescrit",
] as const;

/**
 * Les entrées du modèle citées par le code : questions du questionnaire et règles
 * intermédiaires servant de réponse. Ce sont elles qui composent les situations —
 * base neutre, seeds, pré-remplissage du CERFA.
 */
export const QUESTIONS = [
  "p1_ald_incapacite_ou_deficience",
  "p1_ald_lien_avec_ald_reconnue",
  "p1_ald_seance_specifique",
  "p1_ald_seance_specifique_validee",
  "p1_ald_validee",
  "p1_autonomie",
  "p1_critere_ambulance",
  "p1_critere_asepsie",
  "p1_critere_aucune_situation_encadree",
  "p1_critere_brancardage_portage",
  "p1_critere_fauteuil_sans_transfert",
  "p1_critere_oxygene",
  "p1_critere_position_allongee_demi_assise",
  "p1_critere_regles_hygiene",
  "p1_critere_risques_effets_secondaires",
  "p1_critere_surveillance_personne_qualifiee",
  "p1_motif_accident_travail_maladie_professionnelle",
  "p1_motif_ald",
  "p1_motif_aucun",
  "p1_motif_hospitalisation",
  "p1_motif_retour_etablissement_penitentiaire",
  "p1_motif_seance_chimio_radio_hemodialyse",
  "p1_situation_bariatrique_seul",
  "p1_situation_permission_sans_motif_medical",
  "p1_situation_smur",

  "p2_accident_cause_par_tiers",
  "p2_accompagnement_tiers",
  "p2_avion_ou_bateau",
  "p2_camsp_cmpp",
  "p2_chaque_trajet_aller_superieur_50km",
  "p2_convocation_ou_avis",
  "p2_convocation_ou_avis_type",
  "p2_detenu_hospitalise",
  "p2_detenu_inter_etablissements",
  "p2_detenu_retour_etablissement_penitentiaire",
  "p2_detenu_uhsa_uhsi",
  "p2_distance_aller_superieure_150km",
  "p2_exception_type",
  "p2_informations_trajet_requises",
  "p2_maternite_eloignee",
  "p2_nombre_transports_prevus",
  "p2_patient_hospitalise",
  "p2_prestation_prise_en_charge_applicable",
  "p2_prestation_prise_en_charge_assurance_maladie",
  "p2_samsah",
  "p2_trajet_aller_retour",
  "p2_trajet_arrivee",
  "p2_trajet_depart",
  "p2_transport_en_serie",
  "p2_transport_serie_declenche_dap",
  "p2_transport_urgence",
] as const;

export type Cible = (typeof CIBLES)[number];
export type Question = (typeof QUESTIONS)[number];

/** Toute clé du modèle que le code a le droit de nommer. */
export type CleDeRegle = Cible | Question;

/** Une situation publicodes dont les clés sont vérifiées à la compilation. */
export type SituationTypee = Partial<Record<Question, string>>;
