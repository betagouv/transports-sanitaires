// Le catalogue des seeds : les situations de référence du simulateur.
//
// Les tests le rejouent et l'écran des seeds l'affiche. Dix seeds, une par
// issue de R2, faites de réponses complètes jusqu'à la fin de P2. Elles suivent
// les dix traces de l'oracle de la v10.1.0 : le patient est accompagné d'un
// professionnel (Q1.1) et ses critères sont ceux de la trace, 1 et 5 pour les
// quatre premières et l'étranger, 1 pour les autres. Les cibles attendues sont
// celles des règles.
//
// Une seule trace ne se rejoue pas telle quelle : l'oracle donne à la caisse
// une ALD dont la base juridique est inconnue, et nos questions ne la posent
// pas (`oracle-par-reponses.test.ts`). La seed de la caisse prend un transfert
// que le Centre 15 a demandé, autre raison d'envoyer le patient à la caisse.

import type { Seed } from "../../socle/seeds/seed";
import type { Cibles } from "./declarations/cibles";
import type { Questions } from "./declarations/questions";

const TRAJET_COURT = {
  "Q2.3.1": "1_CINQUANTE_KM_OU_MOINS",
  "Q2.3.2": false,
} as const;

// Le patient de l'oracle : un professionnel l'aide, il est TAP (critères 1 et 5).
const TAP_1_5 = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
  "Q1.2": ["1_PAS_AUTONOME", "5_RISQUE_DE_MALAISE"],
} as const;

// Le même, avec le seul critère 1.
const TAP_1 = { ...TAP_1_5, "Q1.2": ["1_PAS_AUTONOME"] } as const;

// Une séance d'hémodialyse en centre : la séance motive le transport, et P1
// prouve le motif, donc Q2.1 ne se pose pas.
const DIALYSE = {
  ...TAP_1_5,
  "Q1.3": ["5_DIALYSE", "6_PARTAGE_INCOMPATIBLE"],
  "Q1.3.a": "1_OUI",
  "Q2.2.1": ["4_AUCUNE"],
  ...TRAJET_COURT,
} as const;

// Plus de 150 km, sans série : la demande d'accord préalable, avec ou sans urgence.
const DIALYSE_LONGUE = {
  ...DIALYSE,
  "Q2.3.1": "3_PLUS_DE_CENT_CINQUANTE_KM",
  "Q2.3.3": "2_NON",
} as const;

// Un mineur de moins de 16 ans, en permission autorisée, la première.
const PERMISSION_DU_MINEUR = {
  ...TAP_1_5,
  "Q1.3": ["7_AUCUNE"],
  "Q2.1": "11_PERMISSION",
  "Q2.2.1": ["4_AUCUNE"],
  ...TRAJET_COURT,
  "Q2.7": "1_MOINS_DE_SEIZE_ANS",
  "Q2.8.1": "2026-10-01",
  "Q2.8.2": "2026-10-14T09:00",
  "Q2.8.3": "2026-10-15T09:00",
  "Q2.8.4": "1_OUI",
  "Q2.8.4.a": "1_SOINS",
  "Q2.8.5": "2_NON",
} as const;

// Un transfert entre établissements, depuis les urgences : aucun séjour.
const TRANSFERT = {
  ...TAP_1,
  "Q1.3": ["7_AUCUNE"],
  "Q2.1": "9_TRANSFERT",
  "Q2.2.1": ["4_AUCUNE"],
  ...TRAJET_COURT,
  "Q2.5": "1_TRANSFERT",
} as const;

// Un déplacement dont la nature est le motif, sans soin : Q1.3 n'a rien à dire.
const SANS_SOIN = {
  ...TAP_1,
  "Q1.3": ["7_AUCUNE"],
  "Q2.2.1": ["4_AUCUNE"],
  ...TRAJET_COURT,
} as const;

const DOCUMENTS = {
  cible_financeur: "ASSURANCE_MALADIE",
  cible_mode_id: "TAP",
} as const;

export const SEEDS: readonly Seed<Questions, Cibles>[] = [
  {
    id: "issue-pmt",
    label: "Résultat : prescription médicale de transport, pour une dialyse",
    description:
      "Ouvre le résultat d'un patient TAP (critères 1 et 5) qui se rend à une séance d'hémodialyse. L'issue est la prescription médicale de transport (Cerfa S3138g).",
    answers: DIALYSE,
    expected: {
      cible_issue_id: "ISSUE_PMT",
      cible_support_id: "S3138g",
      ...DOCUMENTS,
    },
  },
  {
    id: "issue-dap-sans-urgence",
    label: "Résultat : accord préalable, sans urgence attestée",
    description:
      "Ouvre le résultat d'une dialyse à plus de 150 km, sans urgence attestée en Q2.3.4. L'issue est la demande d'accord préalable (Cerfa S3139h).",
    answers: { ...DIALYSE_LONGUE, "Q2.3.4": "2_NON" },
    expected: {
      cible_issue_id: "ISSUE_DAP_SANS_URGENCE",
      cible_support_id: "S3139h",
      ...DOCUMENTS,
    },
  },
  {
    id: "issue-dap-urgence-attestee",
    label: "Résultat : accord préalable, urgence attestée",
    description:
      "Ouvre le résultat d'une dialyse à plus de 150 km, avec une urgence attestée en Q2.3.4. L'issue est la demande d'accord préalable (Cerfa S3139h), avec son rappel d'urgence.",
    answers: { ...DIALYSE_LONGUE, "Q2.3.4": "1_OUI" },
    expected: {
      cible_issue_id: "ISSUE_DAP_URGENCE_ATTESTEE",
      cible_support_id: "S3139h",
      ...DOCUMENTS,
    },
  },
  {
    id: "issue-s3141",
    label: "Résultat : permission d'un mineur, formulaire S3141",
    description:
      "Ouvre le résultat d'un mineur de moins de 16 ans en permission autorisée (Q2.7, Q2.8), la première. Q2.8.5 dit une permission unique. L'issue est le formulaire S3141.",
    answers: PERMISSION_DU_MINEUR,
    expected: {
      cible_issue_id: "ISSUE_S3141",
      cible_support_id: "S3141",
      ...DOCUMENTS,
    },
  },
  {
    id: "issue-non-eligible",
    label: "Résultat : aucun motif de transport, pour une consultation",
    description:
      "Ouvre le résultat d'un patient TAP qui se rend à une consultation (Q2.1 option 1). Aucun motif ne prend le transport en charge : l'issue est « non éligible ».",
    answers: { ...SANS_SOIN, "Q2.1": "1_CONSULTATION" },
    expected: {
      cible_issue_id: "ISSUE_NON_ELIGIBLE",
      cible_support_id: "AUCUN",
      cible_financeur: "NON_CONCLU",
      cible_mode_id: "TAP",
    },
  },
  {
    id: "issue-caisse",
    label: "Résultat : la caisse tranche, transfert demandé par le Centre 15",
    description:
      "Ouvre le résultat d'un transfert entre établissements définitif que le Centre 15 a demandé (Q2.6). La caisse tranche : l'issue renvoie le praticien vers elle.",
    answers: {
      ...TRANSFERT,
      "Q2.6.a": "1_DEFINITIF",
      "Q2.6": ["3_CENTRE_QUINZE"],
    },
    expected: {
      cible_issue_id: "ISSUE_CAISSE",
      cible_support_id: "AUCUN",
      cible_financeur: "NON_CONCLU",
      cible_mode_id: "TAP",
    },
  },
  {
    id: "issue-etablissement",
    label: "Résultat : l'établissement finance un transfert provisoire",
    description:
      "Ouvre le résultat d'un transfert entre établissements provisoire (Q2.5, Q2.6.a), sans exception de l'article 80 (Q2.6 option 11). L'établissement est le financeur.",
    answers: { ...TRANSFERT, "Q2.6.a": "2_PROVISOIRE", "Q2.6": ["11_AUCUNE"] },
    expected: {
      cible_issue_id: "ISSUE_ETABLISSEMENT",
      cible_support_id: "AUCUN",
      cible_financeur: "ETABLISSEMENT",
      cible_mode_id: "TAP",
    },
  },
  {
    id: "issue-permission-patient",
    label: "Résultat : permission d'un adulte, à sa charge",
    description:
      "Ouvre le résultat d'un adulte en permission, dont le transport est demandé par écrit par lui (Q2.7 option 4), conditions de facturation vérifiées (Q2.7.a). Le patient finance.",
    answers: {
      ...SANS_SOIN,
      "Q2.1": "11_PERMISSION",
      "Q2.7": "4_ADULTE_A_SA_CHARGE",
      "Q2.7.a": "1_OUI",
    },
    expected: {
      cible_issue_id: "ISSUE_PERMISSION_PATIENT",
      cible_support_id: "AUCUN",
      cible_financeur: "PATIENT",
      cible_mode_id: "TAP",
    },
  },
  {
    id: "issue-convocation",
    label: "Résultat : convocation au contrôle médical",
    description:
      "Ouvre le résultat d'un patient convoqué au contrôle médical de l'Assurance Maladie (Q2.1 option 12, Q2.10 option 1). L'Assurance Maladie finance, sans document à remplir.",
    answers: {
      ...SANS_SOIN,
      "Q2.1": "12_CONVOCATION",
      "Q2.10": "1_CONTROLE_MEDICAL",
    },
    expected: {
      cible_issue_id: "ISSUE_CONVOCATION",
      cible_support_id: "AUCUN",
      cible_financeur: "ASSURANCE_MALADIE",
      cible_mode_id: "TAP",
    },
  },
  {
    id: "issue-dap-etranger-a-examiner",
    label: "Résultat : transport à l'étranger, demande d'examen",
    description:
      "Ouvre le résultat d'une dialyse dont le départ est à l'étranger (Q2.2.1, Q2.2.5). La caisse examine la demande (Cerfa S3139h) : le financeur n'est pas conclu.",
    answers: {
      ...DIALYSE,
      "Q2.2.1": ["2_ETRANGER"],
      "Q2.2.5": ["1_DEPART"],
    },
    expected: {
      cible_issue_id: "ISSUE_DAP_ETRANGER_A_EXAMINER",
      cible_support_id: "S3139h",
      cible_financeur: "NON_CONCLU",
      cible_mode_id: "TAP",
    },
  },
];
