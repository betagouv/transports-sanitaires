// Base neutre « tout à non » : chaque question du modèle répondue par sa valeur
// la plus banale. C'est le **fond de carte** des seeds — une seed ne déclare que
// ce qui la distingue (`entrees`), le reste vient d'ici.
//
// Sans cette base, chaque situation devrait répéter les cent réponses du
// questionnaire, et l'ajout d'une question au modèle obligerait à toutes les
// reprendre. Elle sert aussi de garantie : une situation construite sur elle
// n'a aucune variable manquante, donc toutes les cibles s'évaluent.
//
// Formats de valeurs publicodes : booléens `oui`/`non`, énumérés entre quotes
// simples, nombres et textes tels quels. Les dates et heures sont du texte pour
// le modèle : c'est l'application qui en tire durées et rangs de jour.
import type { SituationTypee } from "../../simulateur/contrat-regles-publicodes.ts";

export const BASE_NEUTRE: SituationTypee = {
  // ---- ce que l'application calcule et verse au modèle ----
  //
  // Ces entrées ne sont posées à personne (`owner: application`). La base leur
  // donne des valeurs vraies pour une situation ordinaire : les formats sont
  // valides, les lieux compatibles, la décision médicale prise.
  //
  // La date de référence est **fixe**, et volontairement antérieure au 1er
  // octobre 2026 : c'est la date à partir de laquelle une ALD non exonérante
  // seule cesse d'ouvrir le droit. La prendre du jour ferait basculer toutes les
  // seeds ce matin-là. Celles qui portent sur la bascule la surchargent.
  p0_date_reference_yyyymmdd: "20260101",
  p1_verrou_medical_valide: "oui",
  p2_depart_format_valide: "oui",
  p2_arrivee_format_valide: "oui",
  p2_adresses_strictement_identiques: "non",
  p2_types_lieux_valides: "oui",
  p2_permission_dates_valides: "oui",
  p2_permission_calendrier_valide: "oui",
  p2_permission_duree_heures: "0",
  p2_permission_rang_jour: "0",
  p2_validations_documentaires: "oui",

  // ---- Partie 1, la décision médicale ----

  // Patient autonome : Q1.1 n'est alors pas posée. Les critères restent
  // renseignés à « non » pour qu'une seed qui bascule Q1 sur le besoin
  // professionnel n'ait à déclarer que celui qui la caractérise.
  p1_autonomie:
    "'Peut se déplacer seul, sans aide technique ou humaine et sans besoin particulier sur l’entièreté du trajet.'",
  p1_critere_incapacite_deplacement_autonome: "non",
  p1_critere_aide_technique: "non",
  p1_critere_aide_professionnel: "non",
  p1_critere_hygiene_desinfection: "non",
  p1_critere_risque_effets_secondaires: "non",
  p1_critere_fauteuil_sans_transfert: "non",
  p1_critere_position_allongee_demi_assise: "non",
  p1_critere_brancardage_portage: "non",
  p1_critere_surveillance_constante: "non",
  p1_critere_oxygene: "non",
  p1_critere_isolement_asepsie: "non",
  p1_critere_aucun: "oui",

  p1_transport_partage_incompatible: "non",

  // M0 : l'option exclusive porte la réponse, les cinq cas restent à « non ».
  // Les trois séances y sont désormais distinctes — la v9.7 a défait la case
  // unique « séance » et les a détachées de l'ALD.
  p1_m0_bariatrique: "non",
  p1_m0_ald: "non",
  p1_m0_seance_chimiotherapie: "non",
  p1_m0_seance_radiotherapie: "non",
  p1_m0_seance_dialyse_centre: "non",
  p1_m0_aucun: "oui",

  // Posées seulement si M0 déclare une ALD, ou si le mode n'est pas
  // professionnalisé. La base les renseigne quand même : une seed qui bascule
  // l'un ou l'autre n'a alors que sa propre réponse à déclarer.
  p1_type_ald: "'Non exonérante'",
  p1_mode_non_professionnalise: "'Véhicule personnel'",

  // ---- Partie 2, le cas administratif ----

  // La raison principale a remplacé le contexte unique de la v9.5.1. Les
  // contextes réglementaires, eux, se cumulent à côté d'elle.
  p2_raison_principale: "'Consultation médicale'",
  p2_motif_detail: "'Consultation de cardiologie'",

  p2_type_hospitalisation: "'Hospitalisation complète'",

  p2_contexte_at_mp: "non",
  p2_contexte_engagement_maternite: "non",
  p2_contexte_retour_penitentiaire: "non",
  p2_contexte_centre_reference: "non",
  p2_contexte_pension_militaire: "non",
  p2_contexte_aucun: "oui",

  // Le transfert se qualifie positivement depuis la v9.7 : ni entrée ni sortie
  // ne suffisent, il faut le déclarer.
  p2_transfert_en_cours: "non",
  p2_nature_transfert: "'Définitif'",
  p2_transfert_motif_detail: "'Imagerie médicale'",

  // Permission temporaire de sortie : hors sujet pour la base, mais renseignée
  // pour qu'une seed de permission n'ait pas à reprendre toute la série.
  p2_permission_age: "'20 ans ou plus'",
  p2_permission_debut_hospitalisation: "'2026-01-05'",
  p2_permission_debut: "'2026-01-20T10:00'",
  p2_permission_fin: "'2026-01-20T18:00'",
  p2_permission_cadre: "'Motif thérapeutique'",
  p2_permission_ar_par_mois: "1",
  p2_permission_periode_fin: "'2026-03-31'",

  p2_exception_aide_medicale_urgente: "non",
  p2_exception_avion_bateau: "non",
  p2_exception_had_hors_protocole: "non",
  p2_exception_usld: "non",
  p2_exception_ehpad: "non",
  p2_exception_radiotherapie_moins_48h: "non",
  p2_exception_dialyse_domicile: "non",
  p2_exception_admission_had: "non",
  p2_exception_aucune: "oui",

  p2_convocation_ou_avis_type: "'Aucun de ces cas.'",
  p2_transport_urgence: "'Non'",

  p2_special_avion_bateau: "non",
  p2_special_camsp_cmpp: "non",
  p2_special_samsah: "non",
  p2_special_aucune: "oui",

  p2_nombre_transports_prevus: "1",
  p2_organisation_transports: "'trajets simples'",
  p2_nombre_transports_couvert_simulation: "1",

  p2_trajet_depart: "'Domicile'",
  p2_trajet_arrivee: "'Structure de soins'",
  // Saisies libres (v9.1) : ni vérifiées ni normalisées par le modèle. Des
  // valeurs de fond de carte, reconnaissables comme telles à l'écran et sur le
  // CERFA d'aperçu.
  //
  // Une saisie non remplie est **absente** de la base, jamais une chaîne vide :
  // c'est ce que produit l'interface (`@publicodes/forms` retire la clé dès que
  // le champ est vidé), et une chaîne vide y ferait passer pour renseigné un
  // champ obligatoire qui ne l'est pas. Sont donc absents ici les quatre champs
  // facultatifs (complément, pays) et le nom du lieu de départ — la base part
  // du domicile, qui n'en demande pas. Le pays l'est doublement : la v9.7 a
  // corrigé sa complétude, et interdit d'y injecter une chaîne vide.
  p2_depart_adresse: "'1 rue du Départ'",
  p2_depart_code_postal: "'75001'",
  p2_depart_commune: "'Paris'",
  p2_arrivee_nom_lieu: "'Centre hospitalier'",
  p2_arrivee_adresse: "'2 rue de l’Arrivée'",
  p2_arrivee_code_postal: "'75002'",
  p2_arrivee_commune: "'Paris'",

  p2_tranche_distance_trajet_aller: "'50 km ou moins'",

  p2_accident_cause_par_tiers: "non",
  p2_patient_moins_16_ans: "non",

  // Ticket modérateur (v9.7) : trois listes distinctes, une par document. Le
  // contrat interdit de reporter les réponses de l'une sur l'autre.
  p2_tm_pmt_acte: "non",
  p2_tm_pmt_consecutif: "non",
  p2_tm_pmt_urgence: "non",
  p2_tm_pmt_had: "non",
  p2_tm_pmt_nouveau_ne: "non",
  p2_tm_pmt_aucun: "oui",
  p2_tm_dap_acte: "non",
  p2_tm_dap_consecutif: "non",
  p2_tm_dap_adapte: "non",
  p2_tm_dap_nouveau_ne: "non",
  p2_tm_dap_aucun: "oui",
  p2_tm_s3141_acte: "non",
  p2_tm_s3141_consecutif: "non",
  p2_tm_s3141_urgence: "non",
  p2_tm_s3141_had: "non",
  p2_tm_s3141_nouveau_ne: "non",
  p2_tm_s3141_aucun: "oui",

  p2_maternite_lieu: "'Arrivée'",
  p2_maternite_niveau: "'Type I'",
  p2_htnm_lieu: "'Non'",
};
