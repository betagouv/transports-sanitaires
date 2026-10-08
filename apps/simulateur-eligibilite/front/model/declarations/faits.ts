// Les faits du modèle : ce que ses règles reçoivent, sous le nom que l'éditeur
// leur donne.
//
// Les listes suivent l'ordre des règles. `tests/model/declarations.test.ts` les
// compare à `rules/regles.publicodes`.

/** Les faits qui valent « oui » ou « non ». */
export const FAITS_BOOLEENS = [
  "fait_p1_complete",
  "fait_p2_complete",
  "fait_autonomie_professionnel",
  "fait_critere_allonge",
  "fait_critere_brancard",
  "fait_critere_surveillance",
  "fait_critere_oxygene",
  "fait_critere_asepsie",
  "fait_critere_fauteuil",
  "fait_critere_tap",
  "fait_partage_incompatible",
  "fait_accompagnant",
  "fait_prefere_transport_commun",
  "fait_source_officielle_active",
  "fait_correspondance_univoque",
  "fait_conditions_soin_verifiees",
  "fait_regime_verifie",
  "fait_exclusion_soin_prouvee",
  "fait_evenement_sans_soin",
  "fait_hospitalisation",
  "fait_atmp_lie",
  "fait_ald_liee",
  "fait_ald_base_3",
  "fait_ald_base_4_mineur",
  "fait_motif_camsp",
  "fait_motif_samsah",
  "fait_motif_pension",
  "fait_distance_plus_50",
  "fait_distance_plus_150",
  "fait_meme_type_soins",
  "fait_dans_deux_mois",
  "fait_avion_bateau_ligne",
  "fait_dap_camsp",
  "fait_centre_reference_destination",
  "fait_appel_centre15",
  "fait_dap_maternite",
  "fait_urgence_attestee",
  "fait_urgence_repondue",
  "fait_transfert_article80",
  "fait_exception_article80_admission_sans_sejour",
  "fait_exception_article80_air_mer",
  "fait_exception_article80_had_intercurrent",
  "fait_exception_article80_usld",
  "fait_exception_article80_ehpad",
  "fait_exception_article80_radiotherapie",
  "fait_exception_article80_dialyse_domicile",
  "fait_exception_article80_admission_had",
  "fait_centre15_interetablissements",
  "fait_htnm_hors_maternite",
  "fait_htnm_segment_verifie",
  "fait_permission",
  "fait_permission_mineur_admissible",
  "fait_permission_charge_patient",
  "fait_convocation",
  "fait_seconde_branche_incompatible",
  "fait_preuve_ald_inconnue_decisive",
  "fait_couverture_inconnue_decisive",
] as const;

/** Les faits qui se comptent. */
export const FAITS_NUMERIQUES = ["fait_nombre_transports"] as const;

export type Faits = Readonly<
  Record<(typeof FAITS_BOOLEENS)[number], boolean> &
    Record<(typeof FAITS_NUMERIQUES)[number], number>
>;

/** Rien n'est établi : chaque fait vaut « non », aucun transport n'est compté. */
export const AUCUN_FAIT = {
  ...Object.fromEntries(FAITS_BOOLEENS.map((fait) => [fait, false])),
  ...Object.fromEntries(FAITS_NUMERIQUES.map((fait) => [fait, 0])),
} as Faits;
