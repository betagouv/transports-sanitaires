// Catalogue des situations de référence du simulateur.
//
// C'est la **source unique** : les tests métier rejouent ce catalogue
// (`tests/simulateur/scenarios.test.ts`), la galerie l'affiche
// (`GalerieSeeds.tsx`) et `scripts/apercu-cerfa.ts` en tire le CERFA.
// Une situation ajoutée ici devient donc du même geste un cas de non-régression
// et un écran consultable.
//
// Chaque seed ne déclare que ce qui la distingue (`entrees`) ; tout le reste vient
// de `BASE_NEUTRE`. `outil` dit l'écran sur lequel la galerie atterrit : Page
// Résultat 1 (résultat médical) pour les seeds qui se jouent en Partie 1, Page
// Résultat 2 (résultat final) pour celles dont l'intérêt est le cas final. Depuis
// la Page Résultat 1, le parcours reste franchissable jusqu'au résultat final.

import type { Seed } from "./seed.ts";

/** Seed d'`id` donné. Lève plutôt que de rendre `undefined` : un id mort est un bug. */
export function seedParId(id: string): Seed {
  const seed = SEEDS.find((s) => s.id === id);
  if (!seed) {
    throw new Error(
      `Seed inconnue : « ${id} ». Seeds disponibles : ${SEEDS.map((s) => s.id).join(", ")}.`,
    );
  }
  return seed;
}

// ---- le catalogue ----

// Les deux réponses de Q1 qui écartent la base neutre (patient autonome). C'est
// Q1 qui commande tout le reste de la Partie 1 : l'aide d'un professionnel ouvre
// Q1.1, le proche accompagnant caractérise l'incapacité sans ouvrir Q1.1.
const AIDE_PROFESSIONNEL =
  "'Nécessite une prise en charge spécifique pendant le trajet ou l’aide d’un professionnel pour se déplacer ou accomplir les formalités liées au transport.'";
const PROCHE_ACCOMPAGNANT =
  "'Peut se déplacer avec un proche accompagnant, qui peut l’aider à se déplacer ou à transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'";

// Le contexte administratif (M1.1) est une mosaïque : cocher un contexte décoche
// l'option exclusive de la base neutre.
const CONTEXTE_HOSPITALISATION = {
  p2_contexte_hospitalisation: "oui",
  p2_contexte_aucun: "non",
} as const;

// Cas particulier médical (M0) : même mécanique d'option exclusive.
const M0_AUCUN_DECOCHE = { p1_m0_aucun: "non" } as const;

// Exception A0.2 qui laisse le transport dans le champ de l'Assurance Maladie :
// c'est la réponse qui ouvre la branche « patient détenu » (A1.x) au lieu de
// conclure tout de suite à une prise en charge par l'établissement.
const EXCEPTION_ADMISSION_HAD = {
  p2_exception_admission_had: "oui",
  p2_exception_aucune: "non",
} as const;

export const SEEDS: readonly Seed[] = [
  // ————————————————————————————————————————————————————————————————
  // Partie 1 — routes médicales, atterrissage sur la Page Résultat 1.
  // ————————————————————————————————————————————————————————————————
  {
    id: "prescripteur-ambulance",
    libelle: "Prescripteur — ambulance justifiée",
    description:
      "Besoin d'un professionnel et critère « position allongée », dans un " +
      "contexte d'hospitalisation : le cas riche, avec critères médicaux retenus " +
      "affichés sur la Page Résultat 1.",
    outil: "prescripteur",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_position_allongee_demi_assise: "oui",
      ...CONTEXTE_HOSPITALISATION,
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient:
        "PMT (Prescription Médicale de Transport)",
    },
  },
  {
    id: "prescripteur-non-justifie",
    libelle: "Prescripteur — mode retenu mais aucun droit ouvert",
    description:
      "Un professionnel est nécessaire, mais aucune aide ni condition " +
      "particulière n'est retenue et aucun contexte n'ouvre droit : la Partie 1 " +
      "conclut à un VSL, la Partie 2 referme la prise en charge. En v9.1 la " +
      "Partie 1 conclut toujours à un mode — c'est la Partie 2 qui juge du droit.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_aucune_situation: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final:
        "non éligible à une prise en charge par l’Assurance Maladie",
      cible_regime_financement: "aucune prise en charge dans ce parcours",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "prescripteur-smur",
    libelle: "Prescripteur — intervention SMUR",
    description:
      "Cas particulier médical SMUR : il tranche dès la Partie 1 et court-circuite " +
      "la qualification administrative.",
    outil: "prescripteur",
    entrees: { p1_m0_smur: "oui", ...M0_AUCUN_DECOCHE },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "transport par une équipe SMUR (Structure Mobile d’Urgence et de Réanimation)",
      cible_partie_2_requise: "non",
      cible_cas_final: "SMUR",
      cible_regime_financement: "urgence spécifique",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "prescripteur-bariatrique",
    libelle: "Prescripteur — bariatrique seul",
    description:
      "Contrainte bariatrique sans autre besoin médical : elle ne constitue pas à " +
      "elle seule un motif ouvrant droit, et aucun transport n'est prescriptible.",
    outil: "prescripteur",
    entrees: { p1_m0_bariatrique: "oui", ...M0_AUCUN_DECOCHE },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit: "aucun",
      cible_partie_2_requise: "non",
      cible_cas_final: "bariatrique seul",
      cible_regime_financement: "patient",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "prescripteur-permission-sortie",
    libelle: "Prescripteur — permission de sortie",
    description:
      "Permission de sortie demandée sans motif médical : autre porte de sortie " +
      "précoce de la Partie 1.",
    outil: "prescripteur",
    entrees: {
      p1_m0_permission_sans_motif_medical: "oui",
      ...M0_AUCUN_DECOCHE,
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit: "aucun",
      cible_partie_2_requise: "non",
      cible_cas_final: "permission de sortie sans motif médical",
      cible_regime_financement: "patient",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "prescripteur-ambulance-motif-deduit",
    libelle: "Prescripteur — ambulance sans contexte déclaré",
    description:
      "Aucun contexte administratif coché, mais un critère d'ambulance (oxygène) : " +
      "le motif ouvrant droit se déduit du critère, et l'ambulance reste justifiée.",
    outil: "prescripteur",
    entrees: { p1_autonomie: AIDE_PROFESSIONNEL, p1_critere_oxygene: "oui" },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient:
        "PMT (Prescription Médicale de Transport)",
    },
  },
  {
    id: "prescripteur-vehicule-personnel",
    libelle: "Prescripteur — véhicule personnel ou transport en commun",
    description:
      "Contexte ouvrant droit mais patient autonome : le transport reste pris en " +
      "charge, sans véhicule sanitaire.",
    outil: "prescripteur",
    entrees: { ...CONTEXTE_HOSPITALISATION },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "véhicule personnel ou transport en commun",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient:
        "PMT (Prescription Médicale de Transport)",
    },
  },
  {
    id: "prescripteur-tpmr",
    libelle: "Prescripteur — VSL ou taxi conventionné TPMR",
    description:
      "Maintien dans le fauteuil roulant pendant le transport : le seul critère " +
      "qui fait basculer le mode sur sa variante TPMR sans appeler l'ambulance.",
    outil: "prescripteur",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_fauteuil_sans_transfert: "oui",
      ...CONTEXTE_HOSPITALISATION,
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) TPMR (Transport de Personnes à Mobilité Réduite) ou taxi conventionné TPMR (Transport de Personnes à Mobilité Réduite)",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient:
        "PMT (Prescription Médicale de Transport)",
    },
  },

  // ————————————————————————————————————————————————————————————————
  // Partie 2 — cas finaux, atterrissage sur la Page Résultat 2.
  // ————————————————————————————————————————————————————————————————
  {
    id: "secretariat-prescription",
    libelle: "Secrétariat — prescription (CERFA)",
    description:
      "Le seul cas final proposant le CERFA, et la seed qui sert à le regarder : " +
      "volontairement chargée — deux contextes ouvrant droit, les cinq " +
      "justifications d'ambulance, aller-retour depuis le domicile, urgence SAMU, " +
      "accident causé par un tiers, transport répété — pour montrer d'un coup " +
      "d'œil l'étendue du pré-remplissage et, par contraste, ce qui reste vierge. " +
      "Elle évite en revanche tout ce qui basculerait sur un autre formulaire : " +
      "déclencheurs d'accord préalable et transport en série.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      // Les cinq justifications d'ambulance du CERFA, toutes retenues.
      p1_critere_position_allongee_demi_assise: "oui",
      p1_critere_brancardage_portage: "oui",
      p1_critere_surveillance_constante: "oui",
      p1_critere_oxygene: "oui",
      p1_critere_isolement_asepsie: "oui",
      // Deux contextes administratifs cochés en même temps (choix multiple).
      p2_contexte_hospitalisation: "oui",
      p2_contexte_at_mp: "oui",
      p2_contexte_aucun: "non",
      // Trois transports à moins de 50 km : répété, mais **pas** « en série » — la
      // notice réserve la case « transports itératifs » à ce cas précis.
      p2_nombre_transports_prevus: "3",
      p2_trajet_aller_retour: "'aller-retour identique'",
      p2_transport_urgence:
        "'Appel au SAMU (Service d’Aide Médicale Urgente) - Centre 15'",
      p2_accident_cause_par_tiers: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient:
        "PMT (Prescription Médicale de Transport)",
    },
  },
  {
    id: "secretariat-non-eligible",
    libelle: "Secrétariat — non éligible",
    description:
      "Partie 1 concluante (ambulance), puis patient détenu hospitalisé sans " +
      "transport inter-établissements ni aller sans consentement : la Partie 2 " +
      "referme un droit ouvert en Partie 1.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_position_allongee_demi_assise: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_patient_hospitalise: "oui",
      ...EXCEPTION_ADMISSION_HAD,
      p2_detenu_hospitalise: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final:
        "non éligible à une prise en charge par l’Assurance Maladie",
      cible_regime_financement: "aucune prise en charge dans ce parcours",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "secretariat-accord-prealable-distance",
    libelle: "Secrétariat — accord préalable (plus de 150 km)",
    description:
      "Trajet aller de plus de 150 km : le droit est ouvert, mais sous réserve " +
      "d'un accord préalable — le document change (S3139, pas le CERFA).",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_oxygene: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_distance_aller_superieure_150km: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP (Demande d’Accord Préalable)",
    },
  },
  {
    id: "secretariat-serie-ald-validee",
    libelle: "Secrétariat — série sous ALD validée",
    description:
      "Transport en série calculé (4 transports, chacun à plus de 50 km) sous ALD " +
      "validée par une séance : la série seule ne déclenche pas d'accord préalable.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      p1_m0_ald: "oui",
      p1_m0_seance: "oui",
      ...M0_AUCUN_DECOCHE,
      p2_nombre_transports_prevus: "4",
      p2_chaque_trajet_aller_superieur_50km: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient:
        "PMT (Prescription Médicale de Transport)",
    },
  },
  {
    id: "secretariat-serie-hors-ald",
    libelle: "Secrétariat — série hors ALD",
    description:
      "Même série, mais hors ALD : c'est elle qui déclenche alors la demande " +
      "d'accord préalable. Le pendant de la seed précédente.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_nombre_transports_prevus: "4",
      p2_chaque_trajet_aller_superieur_50km: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP (Demande d’Accord Préalable)",
    },
  },
  {
    id: "secretariat-charge-etablissement",
    libelle: "Secrétariat — charge de l'établissement",
    description:
      "Patient hospitalisé, transport hors des exceptions : la facture revient à " +
      "l'établissement, et aucun document de l'Assurance Maladie n'est remis.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_patient_hospitalise: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "transport à la charge de l’établissement",
      cible_regime_financement: "établissement prescripteur",
      cible_document_a_remettre_au_patient:
        "formulaire ou document interne de l’établissement",
    },
  },
  {
    id: "secretariat-convocation",
    libelle: "Secrétariat — convocation ou avis d'audience",
    description:
      "Déplacement sur convocation du contrôle médical : le transport relève de " +
      "la convocation, non de la prescription.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_convocation_ou_avis: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "convocation ou avis d’audience",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "convocation ou avis d’audience",
    },
  },
  {
    id: "secretariat-prestation-non-prise-en-charge",
    libelle: "Secrétariat — prestation non prise en charge",
    description:
      "La prestation à l'origine du déplacement n'est pas prise en charge " +
      "(A2.3 = Non) — prioritaire sur le mode de transport, aucun document.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_oxygene: "oui",
      p2_prestation_prise_en_charge_assurance_maladie: "non",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prestation non prise en charge par l’Assurance Maladie",
      cible_regime_financement: "aucune prise en charge dans ce parcours",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },

  // ————————————————————————————————————————————————————————————————
  // Non-conformités — routes par lesquelles un transport échappe à la prise en
  // charge de l'Assurance Maladie, ou n'y reste que sous réserve. Elles se lisent
  // sur `cible_regime_financement` : tout ce qui n'est pas « Assurance Maladie »
  // ne doit pas lui être facturé. Ces seeds sont **conformes** au moteur — c'est
  // la situation qui n'ouvre pas droit, pas la seed qui se trompe.
  // ————————————————————————————————————————————————————————————————
  {
    id: "prescripteur-ald-sans-incapacite",
    libelle: "Prescripteur — ALD sans incapacité ni séance",
    description:
      "Des soins en lien avec une ALD reconnue sont déclarés, mais le patient est " +
      "autonome et il ne s'agit pas d'une séance : l'ALD n'est pas validée et " +
      "n'ouvre aucun droit. Une ALD seule ne suffit jamais.",
    outil: "prescripteur",
    entrees: { p1_m0_ald: "oui", ...M0_AUCUN_DECOCHE },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "véhicule personnel ou transport en commun",
      cible_partie_2_requise: "oui",
      cible_cas_final:
        "non éligible à une prise en charge par l’Assurance Maladie",
      cible_regime_financement: "aucune prise en charge dans ce parcours",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "prescripteur-ald-proche-accompagnant",
    libelle: "Prescripteur — ALD validée par un proche accompagnant",
    description:
      "Le pendant de la seed précédente, et un arbitrage propre à la v9.1 : " +
      "l'aide d'un proche accompagnant caractérise l'incapacité — l'ALD est donc " +
      "validée et ouvre le droit — tout en laissant le véhicule personnel ou le " +
      "transport en commun comme mode retenu.",
    outil: "prescripteur",
    entrees: {
      p1_autonomie: PROCHE_ACCOMPAGNANT,
      p1_m0_ald: "oui",
      ...M0_AUCUN_DECOCHE,
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "véhicule personnel ou transport en commun",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient:
        "PMT (Prescription Médicale de Transport)",
    },
  },
  {
    id: "secretariat-detenu-inter-etablissements",
    libelle: "Secrétariat — détenu, transport inter-établissements",
    description:
      "Patient détenu hospitalisé, transport entre deux établissements (A1.2) : la " +
      "charge revient à l'établissement, pas à l'Assurance Maladie. Article 80 — " +
      "situation spécifique, incompatible avec un véhicule personnel.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_patient_hospitalise: "oui",
      ...EXCEPTION_ADMISSION_HAD,
      p2_detenu_hospitalise: "oui",
      p2_detenu_inter_etablissements: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "transport à la charge de l’établissement",
      cible_regime_financement: "établissement prescripteur",
      cible_document_a_remettre_au_patient:
        "formulaire ou document interne de l’établissement",
      cible_article_80_situation_specifique: true,
    },
  },
  {
    id: "secretariat-detenu-uhsa-uhsi",
    libelle: "Secrétariat — détenu, aller sans consentement UHSA/UHSI",
    description:
      "Même branche, autre porte (A1.3) : l'aller sans consentement vers une UHSA ou " +
      "une UHSI relève lui aussi de la charge de l'établissement.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_patient_hospitalise: "oui",
      ...EXCEPTION_ADMISSION_HAD,
      p2_detenu_hospitalise: "oui",
      p2_detenu_uhsa_uhsi: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "transport à la charge de l’établissement",
      cible_regime_financement: "établissement prescripteur",
      cible_document_a_remettre_au_patient:
        "formulaire ou document interne de l’établissement",
      cible_article_80_situation_specifique: true,
    },
  },
  {
    id: "secretariat-detenu-retour-penitentiaire",
    libelle: "Secrétariat — détenu, retour en établissement pénitentiaire",
    description:
      "Le contre-exemple de la branche détenu : en v9.1 le retour pénitentiaire est " +
      "un contexte administratif (M1.1) qui écarte d'emblée les questions A1.x et " +
      "maintient le parcours standard. Avec les deux seeds précédentes et " +
      "« non éligible », les quatre issues de la branche sont couvertes.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      p2_contexte_retour_penitentiaire: "oui",
      p2_contexte_aucun: "non",
      p2_patient_hospitalise: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient:
        "PMT (Prescription Médicale de Transport)",
      cible_article_80_situation_specifique: false,
    },
  },
  {
    id: "secretariat-avion-bateau",
    libelle: "Secrétariat — avion ou bateau de ligne régulière",
    description:
      "Premier des quatre déclencheurs d'accord préalable indépendants de la " +
      "distance, réunis en v9.1 dans une seule question à choix multiples (A3.4) : " +
      "le transport reste pris en charge, mais sous réserve de l'accord de " +
      "l'Assurance Maladie.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_special_avion_bateau: "oui",
      p2_special_aucune: "non",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP (Demande d’Accord Préalable)",
    },
  },
  {
    id: "secretariat-camsp-cmpp",
    libelle: "Secrétariat — CAMSP ou CMPP",
    description:
      "Deuxième situation spéciale de A3.4 (structure médico-sociale).",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_special_camsp_cmpp: "oui",
      p2_special_aucune: "non",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP (Demande d’Accord Préalable)",
    },
  },
  {
    id: "secretariat-maternite-eloignee",
    libelle: "Secrétariat — maternité éloignée (Engagement maternité)",
    description: "Troisième situation spéciale de A3.4.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_special_engagement_maternite: "oui",
      p2_special_aucune: "non",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP (Demande d’Accord Préalable)",
    },
  },
  {
    id: "secretariat-samsah",
    libelle: "Secrétariat — SAMSAH",
    description: "Quatrième et dernière situation spéciale de A3.4.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_special_samsah: "oui",
      p2_special_aucune: "non",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP (Demande d’Accord Préalable)",
    },
  },
  {
    id: "secretariat-accompagnement-tiers",
    libelle: "Secrétariat — accompagnement par un tiers",
    description:
      "Dernier déclencheur d'accord préalable (A3.8) : il ferme le questionnaire A3, " +
      "et c'est sa réponse — oui comme non — qui autorise la conclusion.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CONTEXTE_HOSPITALISATION,
      p2_accompagnement_tiers: "oui",
    },
    attendu: {
      cible_resultat_medical: "décision établie",
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP (Demande d’Accord Préalable)",
    },
  },
] as const;
