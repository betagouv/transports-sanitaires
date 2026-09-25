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
//
// Une seed peut aussi déclarer `atterrissage: "questionnaire"` : elle s'arrête
// alors volontairement en chemin (une entrée à `null` **retire** la réponse de la
// base neutre) et la galerie ouvre le parcours sur la première question restée
// sans réponse. Ce n'est pas un cas de non-régression — elle ne décide aucune
// cible — mais un raccourci vers un écran qu'on veut voir.

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
// Q1.1, le proche accompagnant caractérise l'incapacité sans l'ouvrir.
//
// La v9.7 a retiré la quatrième réponse, l'urgence vitale qui qualifiait un SMUR :
// le cas final « SMUR » n'existe plus, et l'urgence se recueille désormais en
// Partie 2 (`p2_transport_urgence`).
const AIDE_PROFESSIONNEL =
  "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'";
const PROCHE_ACCOMPAGNANT =
  "'Nécessite l’accompagnement d’un proche pour se déplacer ou transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'";

// L'entrée en hospitalisation, motif ouvrant droit le plus banal. La v9.7 a
// remplacé le contexte administratif (M1.1, une mosaïque) par une **raison
// principale** à choix unique : cocher un contexte n'a plus de sens, on choisit.
const RAISON_HOSPITALISATION = {
  p2_raison_principale: "'Entrée en hospitalisation'",
} as const;

// La réponse d'A2.4 qui atteste l'urgence médicale. Depuis la v9.5.1, c'est elle
// qui dispense d'attendre la décision d'accord préalable. La v9.7 a raccourci son
// libellé — le SAMU n'y est plus développé.
const URGENCE_SAMU = "'Appel au SAMU - Centre 15'";

// Les deux mosaïques à option exclusive de la Partie 1. Cocher un critère ou un
// cas particulier suppose de décocher l'option « aucun » que porte la base
// neutre. Q1.1 en a gagné une en v9.7 : elle n'avait pas de sortie « aucun ».
const CRITERE_AUCUN_DECOCHE = { p1_critere_aucun: "non" } as const;
const M0_AUCUN_DECOCHE = { p1_m0_aucun: "non" } as const;

// Les douze saisies d'adresse (D1-D12) retirées de la base neutre : `null` ôte la
// réponse, là où une surcharge ne saurait que la remplacer. C'est ce qui laisse
// une seed s'arrêter sur la page qui les demande.
const SANS_ADRESSES = {
  p2_depart_nom_lieu: null,
  p2_depart_adresse: null,
  p2_depart_complement_adresse: null,
  p2_depart_code_postal: null,
  p2_depart_commune: null,
  p2_depart_pays: null,
  p2_arrivee_nom_lieu: null,
  p2_arrivee_adresse: null,
  p2_arrivee_complement_adresse: null,
  p2_arrivee_code_postal: null,
  p2_arrivee_commune: null,
  p2_arrivee_pays: null,
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
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
    },
    attendu: {
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "prescripteur-non-justifie",
    libelle: "Prescripteur — mode retenu mais aucun droit ouvert",
    description:
      "Un professionnel est nécessaire pendant le trajet, et aucun contexte " +
      "n'ouvre droit : la Partie 1 conclut à un VSL, la Partie 2 referme la " +
      "prise en charge. La Partie 1 conclut toujours à un mode — c'est la " +
      "Partie 2 qui juge du droit.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_aide_professionnel: "oui",
      ...CRITERE_AUCUN_DECOCHE,
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final:
        "non éligible à une prise en charge par l’Assurance Maladie",
      cible_regime_financement: "Absence de prise en charge Assurance Maladie",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "prescripteur-bariatrique",
    libelle: "Prescripteur — bariatrique seul",
    description:
      "Contrainte bariatrique sans autre besoin médical : elle ne constitue pas à " +
      "elle seule un motif ouvrant droit. La v9.5.1 en faisait une sortie " +
      "précoce, avec son cas final « bariatrique seul » et le transport à la " +
      "charge du patient ; la v9.7 a retiré ce cas final et fait aller le " +
      "parcours jusqu'au bout — le mode reste celui d'un patient autonome, et " +
      "c'est la Partie 2 qui conclut à l'absence de droit.",
    outil: "prescripteur",
    entrees: { p1_m0_bariatrique: "oui", ...M0_AUCUN_DECOCHE },
    attendu: {
      cible_transport_sanitaire_prescrit: "véhicule personnel",
      cible_partie_2_requise: "oui",
      cible_cas_final:
        "non éligible à une prise en charge par l’Assurance Maladie",
      cible_regime_financement: "Absence de prise en charge Assurance Maladie",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "secretariat-permission-sans-motif-medical",
    libelle: "Secrétariat — permission de sortie à la charge du patient",
    description:
      "Permission de sortie demandée par le patient, sans justification " +
      "médicale : le transport reste à sa charge. La v9.7 a déplacé ce cas — il " +
      "se qualifiait en M0, par une case du prescripteur, et se qualifie " +
      "désormais en Partie 2, par la raison principale puis le cadre de la " +
      "permission. Il n'est donc plus une sortie précoce de la Partie 1.",
    outil: "secretariat",
    entrees: {
      p2_raison_principale: "'Permission temporaire de sortie'",
      p2_permission_cadre: "'Demande du patient sans justification médicale'",
    },
    attendu: {
      cible_cas_final: "permission de sortie sans motif médical",
      cible_regime_financement: "Patient",
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
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_oxygene: "oui",
      ...CRITERE_AUCUN_DECOCHE,
    },
    attendu: {
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "prescripteur-vehicule-personnel",
    libelle: "Prescripteur — véhicule personnel ou transport en commun",
    description:
      "Contexte ouvrant droit mais patient autonome : le transport reste pris en " +
      "charge, sans véhicule sanitaire.",
    outil: "prescripteur",
    entrees: { ...RAISON_HOSPITALISATION },
    attendu: {
      cible_transport_sanitaire_prescrit: "véhicule personnel",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
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
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) TPMR (Transport de Personnes à Mobilité Réduite) ou taxi conventionné TPMR (Transport de Personnes à Mobilité Réduite)",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
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
      ...CRITERE_AUCUN_DECOCHE,
      // Une raison principale, et un contexte réglementaire par-dessus : la
      // v9.7 sépare les deux, là où la v9.5.1 cochait deux cases d'une même
      // mosaïque.
      ...RAISON_HOSPITALISATION,
      p2_contexte_at_mp: "oui",
      p2_contexte_aucun: "non",
      // Trois transports à moins de 50 km : répété, mais **pas** « en série » — la
      // notice réserve la case « transports itératifs » à ce cas précis.
      p2_nombre_transports_prevus: "3",
      p2_organisation_transports: "'aller-retour identique'",
      p2_transport_urgence: URGENCE_SAMU,
      p2_date_at_mp: "'2026-01-12'",
      p2_accident_cause_par_tiers: "oui",
      p2_date_accident_cause_par_tiers: "'2026-01-12'",
    },
    attendu: {
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "secretariat-ambulance-ouvre-le-droit",
    libelle: "Secrétariat — un critère d’ambulance ouvre le droit à lui seul",
    description:
      "Un besoin de brancardage, et une raison qui n'ouvre rien — un examen sans " +
      "lien avec une ALD : le droit est pourtant ouvert, et le document une PMT. " +
      "Un critère clinique d'ambulance vaut motif à lui seul, là où un besoin " +
      "d'aide d'un professionnel ne le fait pas. Ce n'est pas une nouveauté de " +
      "la v9.7 : `p1_critere_ambulance` figure déjà parmi les motifs en v9.5.1. " +
      "La question est posée à l'éditeur " +
      "(`tmp/9.7/anomalie-v9-7-critere-ambulance-motif.md`) : cette seed " +
      "constate le comportement observé, elle ne l'approuve pas.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_brancardage_portage: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      p2_raison_principale: "'Autre examen ou soin'",
      p2_motif_detail: "'Bilan de suivi sans lien avec une ALD.'",
    },
    attendu: {
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "secretariat-consultation-cardiologie",
    libelle: "Secrétariat — consultation de cardiologie (accident du travail)",
    description:
      "Une consultation ordinaire, sans besoin de transport particulier : le " +
      "droit s'ouvre par le contexte accident du travail, pas par un critère " +
      "d'ambulance. Sert à couvrir la composition des éléments d'ordre médical " +
      "sur un motif précisé plutôt qu'une hospitalisation (spec 0005, parcours " +
      "EM-PARCOURS-PMT-CONSULTATION).",
    outil: "secretariat",
    entrees: {
      p2_raison_principale: "'Consultation médicale'",
      p2_motif_detail: "'Consultation de cardiologie'",
      p2_contexte_at_mp: "oui",
      p2_contexte_aucun: "non",
      p2_date_at_mp: "'2026-01-12'",
    },
    attendu: {
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "secretariat-motif-texte-libre",
    libelle: "Secrétariat — motif en texte libre",
    description:
      "Le motif se précise en texte libre : la composition des éléments " +
      "d'ordre médical le recopie sans réécriture (spec 0005, parcours " +
      "EM-PARCOURS-PMT-TEXTE-LIBRE). Depuis la v9.7.3, c'est la seule forme " +
      "que prend `p2_motif_detail` — le détour par « Autre - préciser » " +
      "n'existe plus dans le modèle.",
    outil: "secretariat",
    entrees: {
      p2_raison_principale: "'Autre examen ou soin'",
      p2_motif_detail: "'IRM de contrôle du genou.'",
      p2_contexte_at_mp: "oui",
      p2_contexte_aucun: "non",
      p2_date_at_mp: "'2026-01-12'",
    },
    attendu: {
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "secretariat-seance-radiotherapie",
    libelle: "Secrétariat — séance de radiothérapie",
    description:
      "Une séance parmi les trois que la composition des éléments d'ordre " +
      "médical rend par un libellé fixe, sans doublon avec le motif quand les " +
      "deux coïncident (spec 0005, parcours EM-PARCOURS-PMT-RADIO).",
    outil: "secretariat",
    entrees: {
      p2_raison_principale: "'Séance de radiothérapie'",
      p1_m0_seance_radiotherapie: "oui",
      p1_m0_aucun: "non",
    },
    attendu: {
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "secretariat-centre-reference-maladies-rares",
    libelle: "Secrétariat — centre de référence maladies rares",
    description:
      "Orientation vers un autre centre de référence dédié à une maladie " +
      "rare, avec le nom du lieu d'arrivée : la composition des éléments " +
      "d'ordre médical l'ajoute au texte (spec 0005, parcours EM-PARCOURS-PMT-RARE).",
    outil: "secretariat",
    entrees: {
      ...RAISON_HOSPITALISATION,
      p2_contexte_centre_reference: "oui",
      p2_contexte_aucun: "non",
    },
    attendu: {
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
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
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",
      p2_justification_longue_distance:
        "'Plateau technique spécialisé indisponible à moins de 150 km.'",
    },
    attendu: {
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP S3139h",
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
      ...CRITERE_AUCUN_DECOCHE,
      p1_m0_ald: "oui",
      p1_m0_seance_chimiotherapie: "oui",
      ...M0_AUCUN_DECOCHE,
      p2_nombre_transports_prevus: "4",
      p2_tranche_distance_trajet_aller:
        "'Plus de 50 km et jusqu’à 150 km inclus'",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
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
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_nombre_transports_prevus: "4",
      p2_tranche_distance_trajet_aller:
        "'Plus de 50 km et jusqu’à 150 km inclus'",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP S3139h",
    },
  },
  {
    id: "secretariat-transfert-provisoire",
    libelle: "Secrétariat — transfert provisoire pour un examen",
    description:
      "Transfert provisoire vers un plateau technique, et le motif recueilli " +
      "après sa nature : la facture revient à l'établissement, et aucun document " +
      "de l'Assurance Maladie n'est remis. C'est le pendant du transfert " +
      "définitif — la v9.7 distingue les deux natures, là où la v9.5.1 tirait " +
      "cette conclusion de la seule hospitalisation du patient.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      p2_raison_principale:
        "'Transfert d’un patient hospitalisé vers un autre établissement de santé'",
      p2_transfert_en_cours: "oui",
      p2_nature_transfert: "'Provisoire'",
      p2_transfert_motif_detail: "'Imagerie médicale'",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "transport à la charge de l’établissement",
      cible_regime_financement: "Établissement",
      cible_document_a_remettre_au_patient:
        "Document interne de l’établissement",
    },
  },
  {
    id: "secretariat-convocation",
    libelle: "Secrétariat — convocation ou avis d'audience",
    description:
      "Déplacement sur convocation du contrôle médical : le transport relève de " +
      "la convocation, non de la prescription. Aucune des caractéristiques " +
      "posées depuis la v9.7.1 (plus de 150 km, avion ou bateau) : le cas reste " +
      "sans accord préalable. La v9.7.1 corrige l'anomalie qui réclamait encore " +
      "le nom du lieu de départ sur cette branche (`FINANCEMENT-NOM_FACTICE`).",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_convocation_ou_avis_type:
        "'Convocation du contrôle médical de l’Assurance Maladie.'",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "convocation ou avis d’audience",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "Convocation ou avis d’audience",
    },
  },
  {
    id: "secretariat-convocation-longue-distance",
    libelle: "Secrétariat — convocation à plus de 150 km",
    description:
      "Nouveauté v9.7.1 : une convocation peut porter ses propres " +
      "caractéristiques. Un trajet aller de plus de 150 km en fait une demande " +
      "d'accord préalable, avec le motif « longue distance » plutôt qu'une " +
      "convocation simple.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_convocation_ou_avis_type:
        "'Convocation du contrôle médical de l’Assurance Maladie.'",
      p2_convocation_plus_150km: "oui",
      p2_convocation_aucune: "non",
      p2_justification_longue_distance:
        "'Plateau technique spécialisé indisponible à moins de 150 km.'",
    },
    attendu: {
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
    },
  },
  {
    id: "secretariat-convocation-avion-hospitalisation",
    libelle: "Secrétariat — convocation en avion, contexte d'hospitalisation",
    description:
      "Un avion ou un bateau de ligne régulière, avec un contexte que le " +
      "modèle sait déjà motiver (ici l'hospitalisation) : la caractéristique " +
      "se rattache à une DAP, comme n'importe quel autre motif d'avion/bateau.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_convocation_ou_avis_type:
        "'Convocation du contrôle médical de l’Assurance Maladie.'",
      p2_convocation_avion_bateau: "oui",
      p2_convocation_aucune: "non",
    },
    attendu: {
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
    },
  },
  {
    id: "secretariat-convocation-orientation-caisse",
    libelle: "Secrétariat — convocation en avion, orientation vers la caisse",
    description:
      "Huitième cas final de la v9.7.1 : un avion ou un bateau de ligne " +
      "régulière que le modèle ne sait rattacher à aucune sous-situation de " +
      "DAP (pas d'hospitalisation, d'ALD ni d'ATMP) oriente le patient vers sa " +
      "caisse plutôt que de fabriquer une demande d'accord préalable.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      // La raison par défaut de la base neutre (Consultation médicale) ne
      // relève d'aucun contexte que le modèle sait motiver : c'est ce qui fait
      // l'orientation caisse plutôt qu'une DAP.
      p2_convocation_ou_avis_type:
        "'Convocation du contrôle médical de l’Assurance Maladie.'",
      p2_convocation_avion_bateau: "oui",
      p2_convocation_aucune: "non",
    },
    attendu: {
      cible_cas_final: "orientation vers la caisse pour accord préalable",
      cible_regime_financement:
        "Assurance Maladie - modalités à confirmer auprès de la caisse",
      cible_document_a_remettre_au_patient:
        "Synthèse pour démarche auprès de la caisse",
    },
  },
  {
    id: "secretariat-convocation-orientation-caisse-sans-adresse",
    libelle:
      "Secrétariat — convocation en avion, orientation caisse sans adresse (TS973-02)",
    description:
      "La même orientation caisse que ci-dessus, sans aucune adresse de trajet : " +
      "aucune DAP n'est produite sur ce parcours, donc rien n'en réclame une. " +
      "Verrouille TS973-02 : le verdict et les six motifs DAP (faux) se " +
      "déterminent sans qu'une adresse soit jamais citée comme manquante.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      p2_convocation_ou_avis_type:
        "'Convocation du contrôle médical de l’Assurance Maladie.'",
      p2_convocation_avion_bateau: "oui",
      p2_convocation_aucune: "non",
      p2_depart_nom_lieu: null,
      p2_depart_adresse: null,
      p2_depart_complement_adresse: null,
      p2_depart_code_postal: null,
      p2_depart_commune: null,
      p2_depart_pays: null,
      p2_arrivee_nom_lieu: null,
      p2_arrivee_adresse: null,
      p2_arrivee_complement_adresse: null,
      p2_arrivee_code_postal: null,
      p2_arrivee_commune: null,
      p2_arrivee_pays: null,
      p2_tranche_distance_trajet_aller: null,
    },
    attendu: {
      cible_cas_final: "orientation vers la caisse pour accord préalable",
      cible_regime_financement:
        "Assurance Maladie - modalités à confirmer auprès de la caisse",
      cible_document_a_remettre_au_patient:
        "Synthèse pour démarche auprès de la caisse",
    },
  },
  {
    id: "secretariat-avion-orientation-caisse-hors-convocation",
    libelle:
      "Secrétariat — avion hors convocation, orientation vers la caisse (TS973-03)",
    description:
      "Famille AUD-AIR-ORIENTATION : un avion ou bateau de ligne régulière en " +
      "« situations spéciales » (hors convocation), sans hospitalisation, ALD " +
      "ni ATMP pour le rattacher à une sous-situation de DAP — la même " +
      "orientation caisse que la convocation, mais sans qu'aucune convocation " +
      "n'existe. Verrouille TS973-03 : le corps du verdict et le cas retenu ne " +
      "doivent mentionner « convocation » à aucun moment.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_brancardage_portage: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      p2_special_avion_bateau: "oui",
      p2_special_aucune: "non",
    },
    attendu: {
      cible_cas_final: "orientation vers la caisse pour accord préalable",
      cible_regime_financement:
        "Assurance Maladie - modalités à confirmer auprès de la caisse",
      cible_document_a_remettre_au_patient:
        "Synthèse pour démarche auprès de la caisse",
    },
  },
  {
    id: "secretariat-permission-s3141",
    libelle: "Secrétariat — permission de sortie, prescription S3141",
    description:
      "Permission temporaire de sortie pour un patient de moins de 20 ans, dans " +
      "les six mois d'une hospitalisation : la v9.7 lui donne un formulaire à " +
      "elle, le S3141, et un septième cas final. Elle prend la place de " +
      "l'ancienne « prestation non prise en charge », que la v9.7 a retirée.",
    outil: "secretariat",
    entrees: {
      p2_raison_principale: "'Permission temporaire de sortie'",
      p2_permission_age: "'De 16 à 19 ans'",
      // Le rang du jour et la durée ne sont pas des questions : l'application
      // les calcule à partir des dates saisies, et le modèle les reçoit. Le
      // S3141 exige le quatorzième jour au moins, et au plus quarante-huit
      // heures — c'est ce que ces deux valeurs décrivent.
      p2_permission_rang_jour: "15",
      p2_permission_duree_heures: "8",
    },
    attendu: {
      cible_cas_final: "prescription S3141",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "S3141",
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
      cible_transport_sanitaire_prescrit: "véhicule personnel",
      cible_partie_2_requise: "oui",
      cible_cas_final:
        "non éligible à une prise en charge par l’Assurance Maladie",
      cible_regime_financement: "Absence de prise en charge Assurance Maladie",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "secretariat-ald-non-retenue-autre-motif",
    libelle:
      "Secrétariat — ALD non retenue, mais hospitalisation ouvrant droit",
    description:
      "Même ALD sans incapacité que la seed précédente, mais le déplacement " +
      "est une entrée ou sortie d'hospitalisation : le motif ALD n'est pas " +
      "retenu et le droit est pourtant ouvert. C'est ce que le Résultat 2 doit " +
      "savoir dire — l'ALD écartée n'écarte pas les autres motifs.",
    outil: "secretariat",
    entrees: {
      p1_m0_ald: "oui",
      ...M0_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
    },
    attendu: {
      cible_transport_sanitaire_prescrit: "véhicule personnel",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "prescripteur-ald-proche-accompagnant",
    libelle: "Prescripteur — ALD validée par un proche accompagnant",
    description:
      "Le pendant de la seed précédente, et un arbitrage propre à la v9.1 : " +
      "l'aide d'un proche accompagnant caractérise l'incapacité — l'ALD est donc " +
      "validée et ouvre le droit — tout en laissant le véhicule personnel ou le " +
      "transport en commun comme mode retenu. La v9.5.0 en avait fait une DAP, " +
      "l'accompagnement valant alors motif d'accord préalable ; la v9.5.1 " +
      "corrige et rend la PMT.",
    outil: "prescripteur",
    entrees: {
      p1_autonomie: PROCHE_ACCOMPAGNANT,
      p1_m0_ald: "oui",
      ...M0_AUCUN_DECOCHE,
    },
    attendu: {
      cible_transport_sanitaire_prescrit: "véhicule personnel",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "secretariat-transfert-inter-etablissements",
    libelle: "Secrétariat — transfert entre deux établissements",
    description:
      "Transfert définitif d'un patient hospitalisé vers un autre établissement : " +
      "la charge revient à l'établissement, pas à l'Assurance Maladie. La v9.5.1 " +
      "y arrivait par la branche « patient détenu » (A1.2) ; la v9.7 qualifie le " +
      "transfert positivement et a supprimé le détour.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      p2_raison_principale:
        "'Transfert d’un patient hospitalisé vers un autre établissement de santé'",
      p2_transfert_en_cours: "oui",
      p2_nature_transfert: "'Définitif'",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "transport à la charge de l’établissement",
      cible_regime_financement: "Établissement",
      cible_document_a_remettre_au_patient:
        "Document interne de l’établissement",
    },
  },
  {
    id: "secretariat-retour-penitentiaire",
    libelle: "Secrétariat — retour en établissement pénitentiaire",
    description:
      "Le contre-exemple du transfert : le retour pénitentiaire reste un contexte " +
      "réglementaire cumulable, et maintient le parcours standard au lieu de " +
      "renvoyer la charge à l'établissement.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      p2_contexte_retour_penitentiaire: "oui",
      p2_contexte_aucun: "non",
      // Le retour pénitentiaire **déduit** le lieu de départ — une structure de
      // soins, jamais demandée au prescripteur —, et une structure porte un nom
      // là où le domicile de la base neutre n'en a pas. L'arrivée, elle, est
      // contrainte par le contrat : un établissement pénitentiaire.
      p2_depart_nom_lieu: "'Centre hospitalier de départ'",
      p2_trajet_arrivee: "'Établissement pénitentiaire'",
      p2_arrivee_nom_lieu: "'Maison d’arrêt'",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "secretariat-ehpad-vers-usld",
    libelle: "Secrétariat — départ d’EHPAD, arrivée en USLD",
    description:
      "Deux des trois types de lieu que la v9.7 a ajoutés aux trois familles " +
      "du formulaire : un EHPAD au départ écrit sur la ligne « autre lieu », " +
      "une USLD à l'arrivée sur la ligne « structure de soins ». Avant la " +
      "0006, ni l'un ni l'autre n'avait de ligne où s'écrire.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_brancardage_portage: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_trajet_depart: "'EHPAD'",
      p2_depart_nom_lieu: "'EHPAD Les Tilleuls'",
      p2_depart_adresse: "'3 rue des Tilleuls'",
      p2_depart_code_postal: "'35000'",
      p2_depart_commune: "'Rennes'",
      p2_trajet_arrivee: "'USLD'",
      p2_arrivee_nom_lieu: "'USLD du CH'",
      p2_arrivee_adresse: "'2 rue de l’Arrivée'",
      p2_arrivee_code_postal: "'75002'",
      p2_arrivee_commune: "'Paris'",
    },
    attendu: {
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
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
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_special_avion_bateau: "oui",
      p2_special_aucune: "non",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP S3139h",
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
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_special_camsp_cmpp: "oui",
      p2_special_aucune: "non",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP S3139h",
    },
  },
  {
    id: "secretariat-engagement-maternite-entree",
    libelle: "Secrétariat — Engagement maternité, seul motif ouvrant droit",
    description:
      "Aucun contexte n'ouvre droit et aucun critère médical ne vaut motif : " +
      "le modèle pose alors A2.4, la qualification précoce du dispositif " +
      "Engagement maternité. Répondre « Oui » ouvre le droit sous accord " +
      "préalable, et rend A3.4 inapplicable — l'option n'y est pas reproposée. " +
      "Le mode médical, lui, ne bouge pas.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      p2_contexte_engagement_maternite: "oui",
      p2_contexte_aucun: "non",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP S3139h",
    },
  },
  {
    id: "secretariat-maternite-eloignee",
    libelle: "Secrétariat — maternité éloignée (Engagement maternité)",
    description:
      "Troisième situation spéciale de A3.4 — l'autre porte du dispositif " +
      "Engagement maternité, celle qu'on emprunte quand un autre motif a déjà " +
      "ouvert le droit et que A2.4 n'a donc pas été posée.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_contexte_engagement_maternite: "oui",
      p2_contexte_aucun: "non",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP S3139h",
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
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_special_samsah: "oui",
      p2_special_aucune: "non",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP S3139h",
    },
  },
  {
    id: "secretariat-permission-longue-distance",
    libelle: "Secrétariat — permission particulière à plus de 150 km",
    description:
      "Permission de sortie d'un patient de moins de 20 ans, mais dont le " +
      "trajet dépasse 150 km : l'accord préalable requis empêche le S3141 " +
      "(réservé aux permissions sans autre cause d'accord préalable) et amène " +
      "la DAP. La composition des éléments d'ordre médical y ajoute le détail " +
      "de la permission — date d'hospitalisation, première permission, " +
      "fréquence et fin (spec 0005, parcours EM-PARCOURS-DAP-PERMISSION).",
    outil: "secretariat",
    entrees: {
      p2_raison_principale: "'Permission temporaire de sortie'",
      p2_permission_age: "'De 16 à 19 ans'",
      p2_permission_rang_jour: "15",
      p2_permission_duree_heures: "8",
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",
      p2_justification_longue_distance:
        "'Plateau technique nécessaire indisponible à proximité.'",
      p2_nombre_transports_permission_dap: "4",
    },
    attendu: {
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP S3139h",
    },
  },
  {
    id: "secretariat-pension-militaire",
    libelle: "Secrétariat — pension militaire d’invalidité",
    description:
      "Soins dispensés au titre d'une pension militaire d'invalidité, sur un " +
      "trajet de plus de 150 km : la composition des éléments d'ordre médical " +
      "y ajoute la phrase fixe du contrat (spec 0005, parcours " +
      "EM-PARCOURS-DAP-PENSION).",
    outil: "secretariat",
    entrees: {
      ...RAISON_HOSPITALISATION,
      p2_contexte_pension_militaire: "oui",
      p2_contexte_aucun: "non",
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",
      p2_justification_longue_distance:
        "'Plateau technique nécessaire indisponible à proximité.'",
    },
    attendu: {
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP S3139h",
    },
  },
  {
    id: "secretariat-dap-motifs-cumules",
    libelle: "Secrétariat — accord préalable à deux motifs",
    description:
      "A3.4 est un choix multiple : deux situations spéciales peuvent être " +
      "cochées ensemble, et l'accord préalable a alors deux causes. Le modèle " +
      "les calcule séparément (une cible par motif) ; la Page Résultat 2 doit " +
      "les restituer toutes les deux, pas seulement la première.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_special_avion_bateau: "oui",
      p2_special_camsp_cmpp: "oui",
      p2_special_aucune: "non",
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP S3139h",
    },
  },
  {
    id: "secretariat-proche-accompagnant",
    libelle: "Secrétariat — proche accompagnant, sans motif d’accord préalable",
    description:
      "Le besoin d'un proche, et rien d'autre. La v9.5.0 en tirait un motif " +
      "d'accord préalable, et donc une DAP ; la v9.5.1 l'a retiré : " +
      "l'accompagnement est une donnée médicale, reportée sur la PMT, et non " +
      "une cause de demande d'accord préalable.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: PROCHE_ACCOMPAGNANT,
      ...RAISON_HOSPITALISATION,
    },
    attendu: {
      cible_transport_sanitaire_prescrit: "véhicule personnel",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "secretariat-urgence-pmt",
    libelle: "Secrétariat — urgence attestée, sans motif d’accord préalable",
    description:
      "Un appel au SAMU (A4.5) sans aucune cause réglementaire de DAP. La " +
      "v9.5.1 expose l'urgence : le document reste une PMT, et le résultat " +
      "porte l'information d'urgence.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_transport_urgence: URGENCE_SAMU,
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "secretariat-urgence-dap",
    libelle:
      "Secrétariat — urgence attestée sur une demande d’accord préalable",
    description:
      "Le même appel au SAMU, mais le trajet aller dépasse 150 km : le motif " +
      "réglementaire tient, donc le document reste une DAP. Ce que l'urgence " +
      "supprime, c'est l'attente — ni réponse du médecin-conseil, ni délai de " +
      "15 jours. C'est la variante urgente de la Page Résultat 2.",
    outil: "secretariat",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",
      p2_justification_longue_distance:
        "'Plateau technique spécialisé indisponible à moins de 150 km.'",
      p2_transport_urgence: URGENCE_SAMU,
    },
    attendu: {
      cible_transport_sanitaire_prescrit:
        "VSL (Véhicule Sanitaire Léger) ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande d’accord préalable",
      cible_regime_financement: "Assurance Maladie",
      cible_document_a_remettre_au_patient: "DAP S3139h",
    },
  },
  {
    id: "secretariat-saisie-adresses",
    libelle: "Questionnaire — saisie des adresses du trajet",
    description:
      "Tout est répondu jusqu'aux adresses, et elles seules manquent : le parcours " +
      "s'ouvre donc sur la page du lieu de départ. Le trajet va d'une structure de " +
      "soins à une autre, la variante qui demande le plus — les six saisies de " +
      "chaque lieu, nom compris.",
    outil: "secretariat",
    atterrissage: "questionnaire",
    entrees: {
      p1_autonomie: AIDE_PROFESSIONNEL,
      p1_critere_hygiene_desinfection: "oui",
      ...CRITERE_AUCUN_DECOCHE,
      ...RAISON_HOSPITALISATION,
      // Hors domicile aux deux bouts : c'est ce qui rend applicables D1 et D7.
      p2_trajet_depart: "'Structure de soins'",
      ...SANS_ADRESSES,
    },
    // Une seed de questionnaire ne décide rien : c'est son propos.
    attendu: {},
  },
] as const;
