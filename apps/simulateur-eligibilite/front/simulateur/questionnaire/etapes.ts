// L'ordre du parcours, déclaré.
//
// Il ne l'a pas toujours été. Jusqu'à la v9.7, l'ordre des questions **se
// déduisait** de ce qui manquait au moteur : `computeNextFields` classe les
// variables manquantes par le score que publicodes leur attribue, et le parcours
// suivait ce classement. Personne ne l'avait choisi : il tombait du graphe, et
// changeait avec lui.
//
// Le contrat d'interface de la v9.7 tranche — `navigation.source: ordered_steps`
// —, et les variables manquantes n'y valent plus que comme diagnostic. Cette
// liste est la recopie de ses cinquante-deux étapes, dans son ordre. Le
// modèle, lui, ne dit plus à quelle étape appartient une question : il portait un
// `spec_id` jusqu'en v9.5.1, il n'en porte plus. C'est ici, et nulle part
// ailleurs, que le rattachement se lit.
//
// Les identifiants sont ceux du contrat. Quand le livrable en donne un second,
// hérité de la spécification (`Q1.1`, `A4.3`), il est recopié en `livrable` :
// c'est sous ce nom qu'un désaccord se discute avec l'éditeur.

import type { CleDeRegle } from "../contrat-regles-publicodes";

export type Etape = {
  /** Identifiant du contrat d'interface (`ui.steps[].id`). */
  readonly id: string;
  /** Identifiant de spécification, quand le livrable en donne un. */
  readonly livrable?: string;
  /** Les règles que l'étape pose, dans l'ordre où elle les présente. */
  readonly champs: readonly CleDeRegle[];
  /**
   * La règle par laquelle le modèle dit l'étape complète. Les mosaïques et les
   * deux pages d'adresse en portent une : leurs champs facultatifs feraient
   * autrement attendre une réponse que personne ne doit donner.
   */
  readonly complet?: CleDeRegle;
};

/**
 * Les étapes du questionnaire, dans l'ordre où elles se posent : la partie
 * médicale d'abord, l'administrative ensuite.
 */
export const ETAPES: readonly Etape[] = [
  // Partie 1 — la décision médicale.
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
  // Partie 2 — le cas administratif.
  {
    id: "p2_raison_principale",
    livrable: "M1.1",
    champs: ["p2_raison_principale"],
  },
  { id: "p2_motif_detail", champs: ["p2_motif_detail"] },
  {
    id: "p2_contextes_complementaires",
    livrable: "M1.2",
    champs: [
      "p2_contexte_at_mp",
      "p2_contexte_engagement_maternite",
      "p2_contexte_retour_penitentiaire",
      "p2_contexte_centre_reference",
      "p2_contexte_pension_militaire",
      "p2_contexte_aucun",
    ],
    complet: "p2_contextes_complementaires_complet",
  },
  {
    id: "p2_transfert_en_cours",
    livrable: "A0.1",
    champs: ["p2_transfert_en_cours"],
  },
  { id: "p2_nature_transfert", champs: ["p2_nature_transfert"] },
  { id: "p2_transfert_motif_detail", champs: ["p2_transfert_motif_detail"] },
  { id: "p2_permission_age", champs: ["p2_permission_age"] },
  {
    id: "p2_permission_debut_hospitalisation",
    champs: ["p2_permission_debut_hospitalisation"],
  },
  { id: "p2_permission_debut", champs: ["p2_permission_debut"] },
  { id: "p2_permission_fin", champs: ["p2_permission_fin"] },
  { id: "p2_permission_cadre", champs: ["p2_permission_cadre"] },
  {
    id: "p2_exceptions_assurance_maladie",
    livrable: "A0.2",
    champs: [
      "p2_exception_aide_medicale_urgente",
      "p2_exception_avion_bateau",
      "p2_exception_had_hors_protocole",
      "p2_exception_usld",
      "p2_exception_ehpad",
      "p2_exception_radiotherapie_moins_48h",
      "p2_exception_dialyse_domicile",
      "p2_exception_admission_had",
      "p2_exception_retour_penitentiaire",
      "p2_exception_aucune",
    ],
    complet: "p2_exceptions_assurance_maladie_complet",
  },
  {
    id: "p2_convocation_ou_avis_type",
    champs: ["p2_convocation_ou_avis_type"],
  },
  {
    id: "p2_convocation_caracteristiques",
    livrable: "CONV-AP",
    champs: [
      "p2_convocation_plus_150km",
      "p2_convocation_avion_bateau",
      "p2_convocation_aucune",
    ],
    complet: "p2_convocation_caracteristiques_complet",
  },
  {
    id: "p2_transport_urgence",
    livrable: "A2.4",
    champs: ["p2_transport_urgence"],
  },
  { id: "p2_urgence_autre_precision", champs: ["p2_urgence_autre_precision"] },
  {
    id: "p2_situations_speciales",
    livrable: "A3.1",
    champs: [
      "p2_special_avion_bateau",
      "p2_special_camsp_cmpp",
      "p2_special_samsah",
      "p2_special_aucune",
    ],
    complet: "p2_situations_speciales_complet",
  },
  {
    id: "p2_nombre_transports_prevus",
    champs: ["p2_nombre_transports_prevus"],
  },
  { id: "p2_organisation_transports", champs: ["p2_organisation_transports"] },
  {
    id: "p2_nombre_transports_couvert_simulation",
    champs: ["p2_nombre_transports_couvert_simulation"],
  },
  { id: "p2_permission_ar_par_mois", champs: ["p2_permission_ar_par_mois"] },
  { id: "p2_permission_periode_fin", champs: ["p2_permission_periode_fin"] },
  { id: "p2_trajet_depart", livrable: "A4.1", champs: ["p2_trajet_depart"] },
  {
    id: "page_adresse_depart",
    champs: [
      "p2_depart_nom_lieu",
      "p2_depart_adresse",
      "p2_depart_complement_adresse",
      "p2_depart_code_postal",
      "p2_depart_commune",
      "p2_depart_pays",
    ],
    complet: "p2_adresse_depart_obligatoire_complete",
  },
  { id: "p2_trajet_arrivee", livrable: "A4.2", champs: ["p2_trajet_arrivee"] },
  {
    id: "page_adresse_arrivee",
    champs: [
      "p2_arrivee_nom_lieu",
      "p2_arrivee_adresse",
      "p2_arrivee_complement_adresse",
      "p2_arrivee_code_postal",
      "p2_arrivee_commune",
      "p2_arrivee_pays",
    ],
    complet: "p2_adresse_arrivee_obligatoire_complete",
  },
  {
    id: "p2_tranche_distance_trajet_aller",
    livrable: "A4.3",
    champs: ["p2_tranche_distance_trajet_aller"],
  },
  {
    id: "p2_justification_longue_distance",
    champs: ["p2_justification_longue_distance"],
  },
  {
    id: "p2_nombre_transports_permission_dap",
    champs: ["p2_nombre_transports_permission_dap"],
  },
  { id: "p2_date_at_mp", livrable: "A5.1", champs: ["p2_date_at_mp"] },
  {
    id: "p2_accident_cause_par_tiers",
    livrable: "A5.2",
    champs: ["p2_accident_cause_par_tiers"],
  },
  {
    id: "p2_date_accident_cause_par_tiers",
    livrable: "A5.3",
    champs: ["p2_date_accident_cause_par_tiers"],
  },
  { id: "p2_patient_moins_16_ans", champs: ["p2_patient_moins_16_ans"] },
  {
    id: "p2_tm_pmt",
    champs: [
      "p2_tm_pmt_acte",
      "p2_tm_pmt_consecutif",
      "p2_tm_pmt_urgence",
      "p2_tm_pmt_had",
      "p2_tm_pmt_nouveau_ne",
      "p2_tm_pmt_aucun",
    ],
    complet: "p2_tm_pmt_complet",
  },
  {
    id: "p2_tm_dap",
    champs: [
      "p2_tm_dap_acte",
      "p2_tm_dap_consecutif",
      "p2_tm_dap_adapte",
      "p2_tm_dap_nouveau_ne",
      "p2_tm_dap_aucun",
    ],
    complet: "p2_tm_dap_complet",
  },
  {
    id: "p2_tm_s3141",
    champs: [
      "p2_tm_s3141_acte",
      "p2_tm_s3141_consecutif",
      "p2_tm_s3141_urgence",
      "p2_tm_s3141_had",
      "p2_tm_s3141_nouveau_ne",
      "p2_tm_s3141_aucun",
    ],
    complet: "p2_tm_s3141_complet",
  },
  { id: "p2_maternite_lieu", champs: ["p2_maternite_lieu"] },
  { id: "p2_maternite_nom", champs: ["p2_maternite_nom"] },
  { id: "p2_maternite_adresse", champs: ["p2_maternite_adresse"] },
  { id: "p2_maternite_niveau", champs: ["p2_maternite_niveau"] },
  { id: "p2_htnm_lieu", champs: ["p2_htnm_lieu"] },
  { id: "p2_htnm_nom", champs: ["p2_htnm_nom"] },
  { id: "p2_htnm_adresse", champs: ["p2_htnm_adresse"] },
];

/** L'étape qui pose cette question, si le parcours en connaît une. */
export function etapeDe(champ: string): Etape | undefined {
  return PAR_CHAMP.get(champ);
}

/**
 * Le rang d'une étape dans le parcours. Ce qu'on ne sait pas placer prend le
 * rang qui suit la dernière étape : ces inconnues se retrouvent en queue, dans
 * l'ordre où elles sont venues, plutôt que dispersées au hasard d'un tri.
 */
export function rangDe(id: string): number {
  return RANGS.get(id) ?? ETAPES.length;
}

// ---- implémentation ----

const RANGS = new Map<string, number>(
  ETAPES.map((etape, rang) => [etape.id, rang]),
);

const PAR_CHAMP = new Map<string, Etape>(
  ETAPES.flatMap((etape) =>
    etape.champs.map((champ) => [champ, etape] as const),
  ),
);
