// Base neutre « tout à non » : chaque question du modèle répondue par sa valeur
// la plus banale. C'est le **fond de carte** des seeds — une seed ne déclare que
// ce qui la distingue (`entrees`), le reste vient d'ici.
//
// Sans cette base, chaque situation devrait répéter les soixante réponses du
// questionnaire, et l'ajout d'une question au modèle obligerait à toutes les
// reprendre. Elle sert aussi de garantie : une situation construite sur elle
// n'a aucune variable manquante, donc toutes les cibles s'évaluent.
//
// Formats de valeurs publicodes : booléens `oui`/`non`, énumérés entre quotes
// simples, nombres et textes tels quels.
import type { SituationTypee } from "../../simulateur/contrat-regles-publicodes.ts";

export const BASE_NEUTRE: SituationTypee = {
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
  p1_critere_aucune_situation: "non",
  p1_transport_partage_incompatible: "non",

  // M0 : l'option exclusive porte la réponse, les cinq cas restent à « non ».
  p1_m0_smur: "non",
  p1_m0_bariatrique: "non",
  p1_m0_permission_sans_motif_medical: "non",
  p1_m0_ald: "non",
  p1_m0_seance: "non",
  p1_m0_aucun: "oui",

  p2_contexte_hospitalisation: "non",
  p2_contexte_at_mp: "non",
  p2_contexte_retour_penitentiaire: "non",
  p2_contexte_aucun: "oui",
  p2_patient_hospitalise: "non",

  p2_exception_aide_medicale_urgente: "non",
  p2_exception_avion_bateau: "non",
  p2_exception_had_hors_protocole: "non",
  p2_exception_usld: "non",
  p2_exception_ehpad: "non",
  p2_exception_radiotherapie_moins_48h: "non",
  p2_exception_dialyse_domicile: "non",
  p2_exception_admission_had: "non",
  p2_exception_permission_mineur: "non",
  p2_exception_aucune: "oui",

  p2_detenu_hospitalise: "non",
  p2_detenu_inter_etablissements: "non",
  p2_detenu_uhsa_uhsi: "non",

  p2_convocation_ou_avis: "non",
  p2_convocation_ou_avis_type: "'Convocation du contrôle médical.'",
  p2_prestation_prise_en_charge_assurance_maladie: "oui",

  p2_distance_aller_superieure_150km: "non",
  p2_nombre_transports_prevus: "1",
  p2_chaque_trajet_aller_superieur_50km: "non",
  p2_special_avion_bateau: "non",
  p2_special_camsp_cmpp: "non",
  p2_special_engagement_maternite: "non",
  p2_special_samsah: "non",
  p2_special_aucune: "oui",
  p2_accompagnement_tiers: "non",
  p2_transport_urgence: "'Non'",

  p2_trajet_aller_retour: "'aller simple'",
  p2_trajet_depart: "'Domicile'",
  p2_trajet_arrivee: "'Une structure de soins différente du lieu de départ.'",
  // Saisies libres (v9.1) : ni vérifiées ni normalisées par le modèle. Des
  // valeurs de fond de carte, reconnaissables comme telles à l'écran et sur le
  // CERFA d'aperçu.
  //
  // Une saisie non remplie est **absente** de la base, jamais une chaîne vide :
  // c'est ce que produit l'interface (`@publicodes/forms` retire la clé dès que
  // le champ est vidé), et une chaîne vide y ferait passer pour renseigné un
  // champ obligatoire qui ne l'est pas. Sont donc absents ici les quatre champs
  // facultatifs (complément, pays) et le nom du lieu de départ — la base part
  // du domicile, qui n'en demande pas.
  p2_depart_adresse: "'1 rue du Départ'",
  p2_depart_code_postal: "'75001'",
  p2_depart_commune: "'Paris'",
  p2_arrivee_nom_lieu: "'Centre hospitalier'",
  p2_arrivee_adresse: "'2 rue de l’Arrivée'",
  p2_arrivee_code_postal: "'75002'",
  p2_arrivee_commune: "'Paris'",

  p2_accident_cause_par_tiers: "non",
};
