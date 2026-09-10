// PMT S3138g, Cerfa 11574*07 — pages 3 et 4 du PDF, volets 1 et 2. Les rubriques
// telles que le YAML documentaire de la v9.7 les décrit, dans l'ordre où le
// prescripteur les rencontre sur le papier. 64 lignes du mapping, comptées par
// `tests/cerfa/mapping.test.ts`.
//
// Les numéros de rubrique sont ceux de **ce** formulaire : l'urgence est en ④
// ici et en ② sur la DAP, l'exonération en ⑥ ici et en ④ là-bas. C'est la raison
// pour laquelle les cases communes aux trois Cerfa ne portent pas leur titre avec
// elles.

import type { Rubrique } from "./case-de-formulaire.ts";
import { ACCIDENT_CAUSE_PAR_UN_TIERS, ORGANISME } from "./rubriques-en-tete.ts";
import { MODE_DE_TRANSPORT } from "./rubriques-mode-de-transport.ts";
import {
  CADRE_TRANSPORTEUR,
  DATE_PRESCRIPTION,
  IDENTITE_PRESCRIPTEUR_ET_STRUCTURE,
  SIGNATURE_PRESCRIPTEUR,
} from "./rubriques-prescripteur.ts";
import {
  EXONERATION_DU_TICKET_MODERATEUR,
  URGENCE,
  VOLET_MEDICAL,
} from "./rubriques-situation-medicale.ts";
import { ADRESSES_DU_TRAJET, TRAJET } from "./rubriques-trajet.ts";

export const RUBRIQUES_PMT: readonly Rubrique[] = [
  {
    ...ACCIDENT_CAUSE_PAR_UN_TIERS,
    cases: [...ACCIDENT_CAUSE_PAR_UN_TIERS.cases, ...ORGANISME],
  },
  {
    titre: "Rubrique ① — situation permettant la prise en charge",
    icone: "fr-icon-health-book-line",
    cases: [
      {
        id: "hospitalisation",
        libelle: "Entrée ou sortie d’hospitalisation, séances incluses.",
        source: "cible_situation_hospitalisation",
      },
      // L'ALD ne se coche qu'une fois validée — reconnue *et* assortie d'une
      // incapacité ou d'une déficience. Une ALD déclarée seule n'ouvre rien, et
      // n'a donc rien à faire sur le formulaire.
      {
        id: "ald_exo",
        libelle: "ALD (Affection de Longue Durée) exonérante.",
        source: "cible_ald_exonerante",
        quand: { toutes: ["p1_ald_validee"] },
      },
      {
        id: "ald_non_exo",
        libelle: "ALD (Affection de Longue Durée) non exonérante.",
        source: "cible_ald_non_exonerante",
        quand: { toutes: ["p1_ald_validee"] },
      },
      {
        id: "atmp",
        libelle:
          "Transport lié à un accident du travail ou une maladie professionnelle.",
        source: "cible_situation_at_mp",
      },
      {
        id: "atmp_date",
        libelle: "Date de l’accident du travail ou de la maladie",
        source: "cible_date_at_mp",
        rendu: "date",
        quand: { toutes: ["cible_situation_at_mp"] },
      },
      // Le livrable la garde dans la rubrique et prévient qu'elle n'y sera jamais
      // cochée : « toujours non sur PMT dans ce contrat — Engagement maternité
      // sélectionne la DAP ». La laisser ici la fera réapparaître d'elle-même si
      // cet arbitrage change.
      {
        id: "maternite",
        libelle: "Engagement maternité.",
        source: "cible_dap_motif_engagement_maternite",
      },
    ],
  },
  {
    titre: "Rubrique ② — mode de transport",
    icone: "fr-icon-car-line",
    cases: MODE_DE_TRANSPORT,
  },
  {
    titre: "Rubriques ② et ③ — trajet et nombre de transports",
    icone: "fr-icon-road-map-line",
    cases: [
      ...TRAJET,
      {
        id: "nombre",
        libelle: "Nombre de transports itératifs",
        source: "cible_nombre_transports_document",
        rendu: "nombre",
      },
      ...ADRESSES_DU_TRAJET,
    ],
  },
  {
    titre: "Rubrique ④ — urgence",
    icone: "fr-icon-alarm-warning-line",
    cases: URGENCE,
  },
  {
    titre: "Rubrique ⑤ — volet 1 exclusivement",
    icone: "fr-icon-stethoscope-line",
    cases: VOLET_MEDICAL,
  },
  {
    titre: "Rubrique ⑥ — exonération du ticket modérateur",
    icone: "fr-icon-money-euro-circle-line",
    cases: [
      ...EXONERATION_DU_TICKET_MODERATEUR,
      // Sur la ligne suivante, et sur le PMT seulement : la DAP n'a pas cette
      // paire de cases, et le livrable met en garde contre le report d'une
      // exonération d'un formulaire à l'autre.
      {
        id: "pension_militaire_oui",
        libelle:
          "Soins au titre d’une pension militaire d’invalidité : cocher « Oui ».",
        source: "cible_situation_pension_militaire",
      },
      {
        id: "pension_militaire_non",
        libelle:
          "Soins au titre d’une pension militaire d’invalidité : cocher « Non ».",
        source: "cible_situation_pension_militaire",
        rendu: "case Non",
      },
    ],
  },
  {
    titre: "Bloc prescripteur et structure",
    icone: "fr-icon-user-line",
    cases: [
      ...IDENTITE_PRESCRIPTEUR_ET_STRUCTURE,
      ...DATE_PRESCRIPTION,
      ...SIGNATURE_PRESCRIPTEUR,
      ...CADRE_TRANSPORTEUR,
    ],
  },
];
