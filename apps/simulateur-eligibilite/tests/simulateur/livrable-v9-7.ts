// La situation d'un cas du livrable, telle que sa matrice la décrit.
//
// `transports-sanitaires.tests.v9-7-0.yaml` ne donne pas des situations mais des
// **options** — `{autonomy: 0, distance: 2, count: 4}` —, qu'un adaptateur de
// référence (`tests/helpers.mjs` du paquet) traduit en réponses. Sans cette
// traduction, aucun de ses 275 cas ne serait rejouable ici.
//
// Ce fichier en est la recopie. Il tient à part de `situations-v9-7.ts`, qui
// porte le vocabulaire de nos propres scénarios : ici, rien n'est de nous — les
// valeurs par défaut sont celles du livrable, y compris quand elles diffèrent des
// nôtres. Sa base répond « besoin d'un professionnel » là où notre base neutre
// répond « autonome », et « aller-retour identique » là où la nôtre dit
// « trajets simples ». Les aligner ferait mentir les attendus.

import type { Situation } from "publicodes";
import { avecEntreesCalculees } from "../../front/simulateur/entrees-calculees";
import { moteurDeTest } from "./moteur";

/** Les options qu'un cas du livrable peut porter. */
export type OptionsDuLivrable = {
  /** Rang de la réponse à Q1 : 0 autonome, 1 proche accompagnant, 2 professionnel. */
  autonomy?: 0 | 1 | 2;
  /** Le critère de Q1.1 coché, les autres restant à « non ». */
  criterion?: string;
  /** Les cas particuliers médicaux cochés en M0. */
  m0?: Record<string, string>;
  /** Les contextes réglementaires cochés. */
  contexts?: Record<string, string>;
  /** Les exceptions cochées derrière un transfert qualifié. */
  exceptions?: Record<string, string>;
  /** Les situations particulières cochées. */
  special?: Record<string, string>;
  /** Les cas d'exonération du ticket modérateur, par document. */
  tmPmt?: Record<string, string>;
  tmDap?: Record<string, string>;
  aldType?: string;
  mode?: string;
  reason?: string;
  age?: string;
  hospital?: string;
  permissionStart?: string;
  permissionEnd?: string;
  permissionCadre?: string;
  urgency?: string;
  depart?: string;
  arrival?: string;
  transfer?: boolean;
  third?: boolean;
  /** Rang de la tranche de distance : 0 ≤ 50 km, 1 jusqu'à 150 km, 2 au-delà. */
  distance?: 0 | 1 | 2;
  count?: number;
  organization?: string;
  /** L'instant de référence, pour les règles datées — la bascule du 1er octobre. */
  instant?: string;
};

/** Les trois réponses de Q1, dans l'ordre du modèle. */
const AUTONOMIE = [
  "Peut se déplacer seul, sans aide technique ou humaine et sans besoin particulier sur l’entièreté du trajet.",
  "Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.",
  "Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.",
];

/** Les trois tranches de distance, dans l'ordre du modèle. */
const DISTANCES = [
  "50 km ou moins",
  "Plus de 50 km et jusqu’à 150 km inclus",
  "Plus de 150 km",
];

/** Un moteur amorcé sur la situation qu'un cas du livrable décrit. */
export function evaluerLeCas(options: OptionsDuLivrable) {
  return moteurDeTest(situationDuLivrable(options));
}

/** La situation publicodes d'un cas du livrable, entrées calculées comprises. */
export function situationDuLivrable(
  options: OptionsDuLivrable = {},
): Situation<string> {
  return avecEntreesCalculees(
    { ...partie1(options), ...partie2(options) },
    options.instant
      ? new Date(options.instant)
      : new Date("2026-09-08T10:00:00Z"),
  );
}

// ---- implémentation ----

const texte = (valeur: string) => `'${valeur}'`;

/**
 * Une mosaïque : les options cochées à « oui », les autres à « non ». La sortie
 * exclusive ne vaut « oui » que si rien d'autre n'est coché.
 */
function mosaique(
  toutes: readonly string[],
  aucun: string,
  cochees: Record<string, string> | undefined,
): Situation<string> {
  const choisies = cochees ?? { [aucun]: "oui" };
  const situation: Situation<string> = {};
  for (const option of toutes) situation[option] = choisies[option] ?? "non";
  situation[aucun] = choisies[aucun] ?? "non";
  return situation;
}

const CRITERES = [
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
];

const CAS_M0 = [
  "p1_m0_bariatrique",
  "p1_m0_ald",
  "p1_m0_seance_chimiotherapie",
  "p1_m0_seance_radiotherapie",
  "p1_m0_seance_dialyse_centre",
];

const CONTEXTES = [
  "p2_contexte_at_mp",
  "p2_contexte_engagement_maternite",
  "p2_contexte_retour_penitentiaire",
  "p2_contexte_centre_reference",
  "p2_contexte_pension_militaire",
];

const EXCEPTIONS = [
  "p2_exception_aide_medicale_urgente",
  "p2_exception_avion_bateau",
  "p2_exception_had_hors_protocole",
  "p2_exception_usld",
  "p2_exception_ehpad",
  "p2_exception_radiotherapie_moins_48h",
  "p2_exception_dialyse_domicile",
  "p2_exception_admission_had",
];

const SPECIALES = [
  "p2_special_avion_bateau",
  "p2_special_camsp_cmpp",
  "p2_special_samsah",
];

const TM_PMT = [
  "p2_tm_pmt_acte",
  "p2_tm_pmt_consecutif",
  "p2_tm_pmt_urgence",
  "p2_tm_pmt_had",
  "p2_tm_pmt_nouveau_ne",
];

const TM_DAP = [
  "p2_tm_dap_acte",
  "p2_tm_dap_consecutif",
  "p2_tm_dap_adapte",
  "p2_tm_dap_nouveau_ne",
];

const TM_S3141 = [
  "p2_tm_s3141_acte",
  "p2_tm_s3141_consecutif",
  "p2_tm_s3141_urgence",
  "p2_tm_s3141_had",
  "p2_tm_s3141_nouveau_ne",
];

function partie1(o: OptionsDuLivrable): Situation<string> {
  const critere = o.criterion ?? "p1_critere_risque_effets_secondaires";
  return {
    p1_autonomie: texte(AUTONOMIE[o.autonomy ?? 2] ?? ""),
    ...mosaique(CRITERES, "p1_critere_aucun", { [critere]: "oui" }),
    p1_transport_partage_incompatible: "non",
    ...mosaique(CAS_M0, "p1_m0_aucun", o.m0),
    p1_type_ald: texte(o.aldType ?? "Exonérante"),
    p1_mode_non_professionnalise: texte(o.mode ?? "Véhicule personnel"),
  };
}

function partie2(o: OptionsDuLivrable): Situation<string> {
  const permission = (o.reason ?? "").includes("Permission");
  return {
    p2_raison_principale: texte(o.reason ?? "Examen médical"),
    p2_motif_detail: texte("Autre - préciser"),
    p2_motif_detail_autre: texte("Examen de contrôle médical"),
    p2_type_hospitalisation: texte("Hospitalisation complète"),
    ...mosaique(CONTEXTES, "p2_contexte_aucun", o.contexts),
    p2_transfert_en_cours: o.transfer ? "oui" : "non",
    p2_nature_transfert: texte("Provisoire"),
    p2_transfert_motif_detail: texte("Autre - préciser"),
    p2_transfert_motif_autre: texte(
      "IRM nécessitant le plateau technique destinataire",
    ),
    ...mosaique(EXCEPTIONS, "p2_exception_aucune", o.exceptions),
    p2_convocation_ou_avis_type: texte("Aucun de ces cas."),
    ...permissionnel(o),
    p2_transport_urgence: texte(o.urgency ?? "Non"),
    p2_urgence_autre_precision: texte(
      "État clinique nécessitant un transport sans délai",
    ),
    ...mosaique(SPECIALES, "p2_special_aucune", o.special),
    p2_nombre_transports_prevus: String(o.count ?? 1),
    p2_organisation_transports: texte(
      o.organization ?? "aller-retour identique",
    ),
    p2_nombre_transports_couvert_simulation: "1",
    ...trajet(o, permission),
    p2_tranche_distance_trajet_aller: texte(DISTANCES[o.distance ?? 0] ?? ""),
    p2_justification_longue_distance: texte(
      "Plateau technique nécessaire indisponible dans les structures plus proches.",
    ),
    p2_date_at_mp: texte("2026-08-01"),
    p2_accident_cause_par_tiers: o.third ? "oui" : "non",
    p2_date_accident_cause_par_tiers: texte("2026-08-01"),
    p2_patient_moins_16_ans: "non",
    ...mosaique(TM_PMT, "p2_tm_pmt_aucun", o.tmPmt),
    ...mosaique(TM_DAP, "p2_tm_dap_aucun", o.tmDap),
    ...mosaique(TM_S3141, "p2_tm_s3141_aucun", undefined),
    p2_maternite_lieu: texte("Arrivée"),
    p2_maternite_niveau: texte("Type IIA"),
    p2_htnm_lieu: texte("Non"),
  };
}

function permissionnel(o: OptionsDuLivrable): Situation<string> {
  return {
    p2_permission_age: texte(o.age ?? "De 16 à 19 ans"),
    p2_permission_debut_hospitalisation: texte(o.hospital ?? "2026-08-01"),
    p2_permission_debut: texte(
      o.permissionStart ?? "2026-09-05T10:00:00+02:00",
    ),
    p2_permission_fin: texte(o.permissionEnd ?? "2026-09-07T10:00:00+02:00"),
    p2_permission_cadre: texte(o.permissionCadre ?? "Motif thérapeutique"),
    p2_permission_ar_par_mois: "4",
    p2_permission_periode_fin: texte("2026-12-31"),
    p2_nombre_transports_permission_dap: "12",
  };
}

// Une permission part d'une structure de soins vers un lieu de vie ; un transfert
// relie deux structures. Partout ailleurs, on part du domicile.
function trajet(o: OptionsDuLivrable, permission: boolean): Situation<string> {
  const depart =
    o.depart ?? (o.transfer || permission ? "Structure de soins" : "Domicile");
  const arrivee = o.arrival ?? (permission ? "Domicile" : "Structure de soins");
  return {
    p2_trajet_depart: texte(depart),
    p2_trajet_arrivee: texte(arrivee),
    p2_depart_nom_lieu: texte("Centre Alpha"),
    p2_depart_adresse: texte("12 rue des Lilas"),
    p2_depart_code_postal: texte("01000"),
    p2_depart_commune: texte("Bourg en Bresse"),
    p2_arrivee_nom_lieu: texte("Centre Bêta"),
    p2_arrivee_adresse: texte("30 rue Victor Hugo"),
    p2_arrivee_code_postal: texte("69001"),
    p2_arrivee_commune: texte("Lyon"),
  };
}
