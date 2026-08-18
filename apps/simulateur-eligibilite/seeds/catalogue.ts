// Catalogue des situations de référence du simulateur.
//
// C'est la **source unique** : les tests métier rejouent ce catalogue
// (`tests/simulateur/scenarios.test.ts`), la galerie dev l'affiche
// (`front/seeds/GalerieSeeds.tsx`) et `scripts/apercu-cerfa.ts` en tire le CERFA.
// Une situation ajoutée ici devient donc du même geste un cas de non-régression
// et un écran consultable.
//
// Chaque seed ne déclare que ce qui la distingue (`entrees`) ; tout le reste vient
// de `BASE_NEUTRE`. `outil` dit l'écran sur lequel la galerie atterrit : Page
// Résultat 1 (résultat médical) pour les seeds qui se jouent en Partie 1, Page
// Résultat 2 (résultat final) pour celles dont l'intérêt est le cas final. Depuis
// la Page Résultat 1, le parcours reste franchissable jusqu'au résultat final.

import type { Seed } from "./seed.ts";

// Exception A0.2-A0.3 qui laisse le transport dans le champ de l'Assurance Maladie :
// c'est la réponse qui ouvre la branche « patient détenu » (A1.x) au lieu de conclure
// tout de suite à une prise en charge par l'établissement.
const EXCEPTION_HAD = "'Retour en HAD (Hospitalisation À Domicile).'";

export const SEEDS: readonly Seed[] = [
  // ————————————————————————————————————————————————————————————————
  // Partie 1 — routes médicales, atterrissage sur la Page Résultat 1.
  // ————————————————————————————————————————————————————————————————
  {
    id: "prescripteur-ambulance",
    libelle: "Prescripteur — ambulance justifiée",
    description:
      "Motif ouvrant droit (hospitalisation) et critère « position allongée » : " +
      "le cas favorable riche, avec critères et motifs retenus affichés.",
    outil: "prescripteur",
    entrees: {
      p1_motif_hospitalisation: "oui",
      p1_critere_position_allongee_demi_assise: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Prescription Médicale de Transport",
    },
  },
  {
    id: "prescripteur-non-justifie",
    libelle: "Prescripteur — transport non justifié",
    description:
      "Aucun motif ouvrant droit et aucune situation encadrée : le parcours " +
      "s'arrête en Partie 1, sans transport prescriptible.",
    outil: "prescripteur",
    entrees: {
      p1_motif_aucun: "oui",
      p1_critere_aucune_situation_encadree: "oui",
    },
    attendu: {
      cible_resultat_medical: "défavorable",
      cible_transport_sanitaire_prescrit: "aucun",
      cible_partie_2_requise: "non",
      cible_cas_final: "non éligible assurance maladie dans ce parcours",
      cible_regime_financement: "à qualifier",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "prescripteur-smur",
    libelle: "Prescripteur — intervention SMUR",
    description:
      "Situation SMUR : tranchée dès la première question, elle court-circuite " +
      "motifs et critères.",
    outil: "prescripteur",
    entrees: { p1_situation_smur: "oui" },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "transport par équipe SMUR",
      cible_partie_2_requise: "non",
      cible_cas_final: "SMUR",
      cible_regime_financement: "urgence spécifique",
      cible_document_a_remettre_au_patient:
        "document ou consignes remis par l’équipe médicale, le service d’urgence ou l’établissement concerné",
    },
  },
  {
    id: "prescripteur-bariatrique",
    libelle: "Prescripteur — bariatrique seul",
    description:
      "Transport bariatrique sans autre justification : hors champ du parcours, " +
      "aucun transport sanitaire prescrit.",
    outil: "prescripteur",
    entrees: { p1_situation_bariatrique_seul: "oui" },
    attendu: {
      cible_resultat_medical: "défavorable",
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
      "Permission de sortie sans motif médical : autre porte de sortie précoce " +
      "de la Partie 1.",
    outil: "prescripteur",
    entrees: { p1_situation_permission_sans_motif_medical: "'Oui'" },
    attendu: {
      cible_resultat_medical: "défavorable",
      cible_transport_sanitaire_prescrit: "aucun",
      cible_partie_2_requise: "non",
      cible_cas_final: "permission sortie sans motif médical",
      cible_regime_financement: "patient",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "prescripteur-ambulance-motif-deduit",
    libelle: "Prescripteur — ambulance sans motif déclaré",
    description:
      "« Aucun motif » coché, mais un critère médical encadré (oxygène) : le motif " +
      "ouvrant droit est déduit du critère, et l'ambulance reste justifiée.",
    outil: "prescripteur",
    entrees: { p1_motif_aucun: "oui", p1_critere_oxygene: "oui" },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Prescription Médicale de Transport",
    },
  },
  {
    id: "prescripteur-vehicule-personnel",
    libelle: "Prescripteur — véhicule personnel ou transport en commun",
    description:
      "Motif ouvrant droit mais aucune situation encadrée : le transport reste " +
      "pris en charge, sans véhicule sanitaire.",
    outil: "prescripteur",
    entrees: {
      p1_motif_hospitalisation: "oui",
      p1_critere_aucune_situation_encadree: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "véhicule personnel ou transport en commun",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Prescription Médicale de Transport",
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
      "volontairement chargée — deux motifs ouvrant droit, les cinq justifications " +
      "d'ambulance, aller-retour depuis le domicile, urgence SAMU, accident causé " +
      "par un tiers, transport répété — pour montrer d'un coup d'œil l'étendue du " +
      "pré-remplissage et, par contraste, ce qui reste vierge. Elle évite en " +
      "revanche tout ce qui basculerait sur un autre formulaire : déclencheurs " +
      "d'accord préalable et transport en série.",
    outil: "secretariat",
    entrees: {
      // Deux motifs ouvrant droit cochés en même temps (choix multiple).
      p1_motif_hospitalisation: "oui",
      p1_motif_accident_travail_maladie_professionnelle: "oui",
      // Les cinq justifications d'ambulance du CERFA, toutes retenues.
      p1_critere_position_allongee_demi_assise: "oui",
      p1_critere_brancardage_portage: "oui",
      p1_critere_surveillance_personne_qualifiee: "oui",
      p1_critere_oxygene: "oui",
      p1_critere_asepsie: "oui",
      // Trois transports à moins de 50 km : répété, mais **pas** « en série » — la
      // notice réserve la case « transports itératifs » à ce cas précis.
      p2_nombre_transports_prevus: "3",
      p2_trajet_aller_retour: "'Aller-retour'",
      p2_transport_urgence: "'Appel SAMU - Centre 15'",
      p2_accident_cause_par_tiers:
        "'Oui, en rapport avec un accident causé par un tiers'",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Prescription Médicale de Transport",
    },
  },
  {
    id: "secretariat-non-eligible",
    libelle: "Secrétariat — non éligible",
    description:
      "Partie 1 favorable (ambulance), puis patient détenu hospitalisé hors " +
      "exceptions : la Partie 2 referme un droit ouvert en Partie 1.",
    outil: "secretariat",
    entrees: {
      p1_motif_ald: "oui",
      p1_ald_lien_avec_ald_reconnue: "oui",
      p1_ald_incapacite_ou_deficience: "oui",
      p1_critere_position_allongee_demi_assise: "oui",
      p2_patient_hospitalise: "oui",
      // v8.9 : `p2_exception_restant_assurance_maladie` est désormais dérivé du
      // type d'exception A0.2-A0.3 ; on ne renseigne plus que ce dernier.
      p2_exception_type: EXCEPTION_HAD,
      p2_detenu_hospitalise: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "non éligible assurance maladie dans ce parcours",
      cible_regime_financement: "à qualifier",
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
      p1_motif_hospitalisation: "oui",
      p1_critere_oxygene: "oui",
      p2_distance_aller_superieure_150km: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande accord préalable",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Demande d’Accord Préalable",
    },
  },
  {
    id: "secretariat-serie-ald-validee",
    libelle: "Secrétariat — série sous ALD validée",
    description:
      "Transport en série calculé (4 transports, chacun à plus de 50 km) sous ALD " +
      "validée : la série seule ne déclenche pas d'accord préalable.",
    outil: "secretariat",
    entrees: {
      p1_motif_ald: "oui",
      p1_ald_lien_avec_ald_reconnue: "oui",
      p1_ald_seance_specifique: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_nombre_transports_prevus: "4",
      p2_chaque_trajet_aller_superieur_50km: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Prescription Médicale de Transport",
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
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_nombre_transports_prevus: "4",
      p2_chaque_trajet_aller_superieur_50km: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande accord préalable",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Demande d’Accord Préalable",
    },
  },
  {
    id: "secretariat-charge-etablissement",
    libelle: "Secrétariat — charge de l'établissement",
    description:
      "Patient hospitalisé, transport hors des exceptions : la facture revient à " +
      "l'établissement, et aucun document n'est remis au patient.",
    outil: "secretariat",
    entrees: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_patient_hospitalise: "oui",
      p2_exception_type: "'Non, le transport ne fait pas partie de ces exceptions.'",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "transport charge établissement",
      cible_regime_financement: "établissement prescripteur",
      cible_document_a_remettre_au_patient:
        "formulaire établissement ou document interne",
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
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_convocation_ou_avis: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "convocation ou avis audience",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "convocation ou avis d’audience",
    },
  },
  {
    id: "secretariat-prestation-non-prise-en-charge",
    libelle: "Secrétariat — prestation non prise en charge",
    description:
      "v8.10 : la prestation à l'origine du déplacement n'est pas prise en charge " +
      "(A2.3 = Non) — prioritaire sur le mode de transport, aucun document.",
    outil: "secretariat",
    entrees: {
      p1_motif_aucun: "oui",
      p1_critere_oxygene: "oui",
      p2_prestation_prise_en_charge_assurance_maladie: "non",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prestation non prise en charge par assurance maladie",
      cible_regime_financement: "patient",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  // ————————————————————————————————————————————————————————————————
  // Non-conformités — routes par lesquelles un transport échappe à la prise en
  // charge de l'Assurance Maladie, ou n'y reste que sous réserve. Elles se lisent
  // sur `cible_regime_financement` : tout ce qui n'est pas « assurance maladie »
  // ne doit pas lui être facturé. Ces seeds sont **conformes** au moteur — c'est
  // la situation qui n'ouvre pas droit, pas la seed qui se trompe.
  // ————————————————————————————————————————————————————————————————
  {
    id: "prescripteur-ald-sans-lien",
    libelle: "Prescripteur — ALD sans lien avec le transport",
    description:
      "La non-conformité la plus courante : une ALD est reconnue, mais le transport "
      + "n'est pas en lien avec elle (M2.1 = non) et aucune situation encadrée ne le "
      + "justifie. L'ALD ne suffit jamais à elle seule.",
    outil: "prescripteur",
    entrees: {
      p1_motif_ald: "oui",
      p1_ald_lien_avec_ald_reconnue: "non",
      p1_critere_aucune_situation_encadree: "oui",
    },
    attendu: {
      cible_resultat_medical: "défavorable",
      cible_transport_sanitaire_prescrit: "aucun",
      cible_partie_2_requise: "non",
      cible_cas_final: "non éligible assurance maladie dans ce parcours",
      cible_regime_financement: "à qualifier",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "prescripteur-ald-sans-incapacite",
    libelle: "Prescripteur — ALD en lien, mais sans incapacité",
    description:
      "Variante plus fine : le lien avec l'ALD est établi, mais il ne s'agit ni d'une "
      + "séance spécifique ni d'une incapacité ou déficience (M2.3, déduite de Q1 et "
      + "des critères). Le motif ALD n'est donc pas validé.",
    outil: "prescripteur",
    entrees: {
      p1_motif_ald: "oui",
      p1_ald_lien_avec_ald_reconnue: "oui",
      p1_critere_aucune_situation_encadree: "oui",
    },
    attendu: {
      cible_resultat_medical: "défavorable",
      cible_transport_sanitaire_prescrit: "aucun",
      cible_partie_2_requise: "non",
      cible_cas_final: "non éligible assurance maladie dans ce parcours",
      cible_regime_financement: "à qualifier",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "secretariat-detenu-inter-etablissements",
    libelle: "Secrétariat — détenu, transport inter-établissements",
    description:
      "Patient détenu hospitalisé, transport entre deux établissements (A1.2) : la "
      + "charge revient à l'établissement, pas à l'Assurance Maladie. Article 80 — "
      + "situation spécifique, incompatible avec un véhicule personnel.",
    outil: "secretariat",
    entrees: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_patient_hospitalise: "oui",
      p2_exception_type: EXCEPTION_HAD,
      p2_detenu_hospitalise: "oui",
      p2_detenu_inter_etablissements: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "transport charge établissement",
      cible_regime_financement: "établissement prescripteur",
      cible_document_a_remettre_au_patient:
        "formulaire établissement ou document interne",
      cible_article_80_situation_specifique: true,
    },
  },
  {
    id: "secretariat-detenu-uhsa-uhsi",
    libelle: "Secrétariat — détenu, aller sans consentement UHSA/UHSI",
    description:
      "Même branche, autre porte (A1.3) : l'aller sans consentement vers une UHSA ou "
      + "une UHSI relève lui aussi de la charge de l'établissement.",
    outil: "secretariat",
    entrees: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_patient_hospitalise: "oui",
      p2_exception_type: EXCEPTION_HAD,
      p2_detenu_hospitalise: "oui",
      p2_detenu_uhsa_uhsi: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "transport charge établissement",
      cible_regime_financement: "établissement prescripteur",
      cible_document_a_remettre_au_patient:
        "formulaire établissement ou document interne",
      cible_article_80_situation_specifique: true,
    },
  },
  {
    id: "secretariat-detenu-retour-penitentiaire",
    libelle: "Secrétariat — détenu, retour en établissement pénitentiaire",
    description:
      "Le contre-exemple de la branche détenu (A1.4) : le retour vers l'établissement "
      + "pénitentiaire rebascule dans le parcours standard et reste pris en charge. "
      + "Avec les deux seeds précédentes et « non éligible », les quatre issues de la "
      + "branche sont couvertes.",
    outil: "secretariat",
    entrees: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_patient_hospitalise: "oui",
      p2_exception_type: EXCEPTION_HAD,
      p2_detenu_hospitalise: "oui",
      p2_detenu_retour_etablissement_penitentiaire: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "prescription médicale de transport",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Prescription Médicale de Transport",
      cible_article_80_situation_specifique: false,
    },
  },
  {
    id: "secretariat-permission-therapeutique",
    libelle: "Secrétariat — permission de sortie thérapeutique",
    description:
      "Une permission de sortie est en jeu, avec motif médical (M0.3 = Non), pour un "
      + "patient hospitalisé hors exceptions : charge de l'établissement, au titre de "
      + "l'Article 80 — permission de sortie thérapeutique. C'est la valeur `Non` de "
      + "M0.3 qui distingue cette seed de « charge de l'établissement ».",
    outil: "secretariat",
    entrees: {
      p1_situation_permission_sans_motif_medical: "'Non'",
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_patient_hospitalise: "oui",
      p2_exception_type: "'Non, le transport ne fait pas partie de ces exceptions.'",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "transport charge établissement",
      cible_regime_financement: "établissement prescripteur",
      cible_document_a_remettre_au_patient:
        "formulaire établissement ou document interne",
      cible_article_80_permission_sortie_therapeutique: true,
    },
  },
  {
    id: "secretariat-avion-bateau",
    libelle: "Secrétariat — avion ou bateau de ligne régulière",
    description:
      "Premier des cinq déclencheurs d'accord préalable indépendants de la distance "
      + "(A3.4) : le transport reste pris en charge, mais sous réserve de l'accord de "
      + "l'Assurance Maladie.",
    outil: "secretariat",
    entrees: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_avion_ou_bateau: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande accord préalable",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Demande d’Accord Préalable",
    },
  },
  {
    id: "secretariat-camsp-cmpp",
    libelle: "Secrétariat — CAMSP ou CMPP",
    description: "Déclencheur d'accord préalable A3.5 (structure médico-sociale).",
    outil: "secretariat",
    entrees: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_camsp_cmpp: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande accord préalable",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Demande d’Accord Préalable",
    },
  },
  {
    id: "secretariat-maternite-eloignee",
    libelle: "Secrétariat — maternité éloignée (Engagement maternité)",
    description: "Déclencheur d'accord préalable A3.6.",
    outil: "secretariat",
    entrees: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_maternite_eloignee: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande accord préalable",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Demande d’Accord Préalable",
    },
  },
  {
    id: "secretariat-samsah",
    libelle: "Secrétariat — SAMSAH",
    description: "Déclencheur d'accord préalable A3.7.",
    outil: "secretariat",
    entrees: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_samsah: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande accord préalable",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Demande d’Accord Préalable",
    },
  },
  {
    id: "secretariat-accompagnement-tiers",
    libelle: "Secrétariat — accompagnement par un tiers",
    description:
      "Dernier déclencheur d'accord préalable (A3.8) : il ferme le questionnaire A3, "
      + "et c'est sa réponse — oui comme non — qui autorise la conclusion.",
    outil: "secretariat",
    entrees: {
      p1_motif_hospitalisation: "oui",
      p1_critere_regles_hygiene: "oui",
      p2_accompagnement_tiers: "oui",
    },
    attendu: {
      cible_resultat_medical: "favorable",
      cible_transport_sanitaire_prescrit: "VSL ou taxi conventionné",
      cible_partie_2_requise: "oui",
      cible_cas_final: "demande accord préalable",
      cible_regime_financement: "assurance maladie",
      cible_document_a_remettre_au_patient: "Demande d’Accord Préalable",
    },
  },
] as const;

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
