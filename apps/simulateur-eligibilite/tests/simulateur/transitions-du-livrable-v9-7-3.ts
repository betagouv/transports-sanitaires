// Les modifications après coup de la campagne v9.7.3 de l'éditeur
// (`tests/campagne-v973/transitions.mjs`), recopiées en données sous leurs
// identifiants `TR-*`. `campagne-transitions-v9-7-3.test.ts` les rejoue.

import type { OptionsDuLivrable } from "./livrable-v9-7-3";

/** Une modification : la simulation de départ, ce qui change, et l'étape où. */
export type Transition = {
  id: string;
  from?: OptionsDuLivrable;
  to?: OptionsDuLivrable;
  step: string;
};

const TRANSFERT =
  "Transfert d’un patient hospitalisé vers un autre établissement de santé";
const STRUCTURES = {
  depart: "Structure de soins",
  arrival: "Structure de soins",
};
const TRAJETS: Record<string, OptionsDuLivrable> = {
  "Entrée en hospitalisation": {
    depart: "Domicile",
    arrival: "Structure de soins",
  },
  "Sortie d’hospitalisation": {
    depart: "Structure de soins",
    arrival: "Domicile",
  },
  [TRANSFERT]: STRUCTURES,
  "Permission temporaire de sortie": {
    depart: "Structure de soins",
    arrival: "Domicile",
  },
};
const RAISONS_SAUF_EXAMEN = [
  "Consultation médicale",
  "Soin ou traitement autre qu’une séance de chimiothérapie, de radiothérapie ou de dialyse",
  "Entrée en hospitalisation",
  "Sortie d’hospitalisation",
  TRANSFERT,
  "Transport vers un service d’urgences",
  "Permission temporaire de sortie",
  "Autre examen ou soin",
];

export const TRANSITIONS: readonly Transition[] = [
  ...RAISONS_SAUF_EXAMEN.map((reason, rang) => ({
    id: `TR-REASON-${rang + 1}`,
    to: { reason, ...TRAJETS[reason] },
    step: "p2_raison_principale",
  })),
  {
    id: "TR-REASON-9",
    from: {
      reason: "Sortie d’hospitalisation",
      ...TRAJETS["Sortie d’hospitalisation"],
    },
    to: {
      reason: "Examen médical",
      depart: "Domicile",
      arrival: "Structure de soins",
    },
    step: "p2_raison_principale",
  },
  {
    id: "TR-REASON-10",
    from: {
      reason: "Permission temporaire de sortie",
      depart: "Structure de soins",
      arrival: "Domicile",
    },
    to: {
      reason: "Consultation médicale",
      depart: "Domicile",
      arrival: "Structure de soins",
    },
    step: "p2_raison_principale",
  },
  {
    id: "TR-REASON-11",
    from: { reason: TRANSFERT, ...STRUCTURES },
    to: { reason: "Examen médical", depart: "Domicile" },
    step: "p2_raison_principale",
  },
  {
    id: "TR-CTX-1",
    to: { contexts: { p2_contexte_at_mp: "oui" } },
    step: "p2_contextes_complementaires",
  },
  {
    id: "TR-CTX-2",
    from: { contexts: { p2_contexte_at_mp: "oui" } },
    to: { contexts: { p2_contexte_aucun: "oui" } },
    step: "p2_contextes_complementaires",
  },
  {
    id: "TR-CTX-3",
    from: { contexts: { p2_contexte_at_mp: "oui" } },
    to: { contexts: { p2_contexte_pension_militaire: "oui" } },
    step: "p2_contextes_complementaires",
  },
  {
    id: "TR-CTX-4",
    from: {
      reason: "Sortie d’hospitalisation",
      depart: "Structure de soins",
      arrival: "Établissement pénitentiaire",
      contexts: { p2_contexte_retour_penitentiaire: "oui" },
    },
    to: { arrival: "Domicile", contexts: { p2_contexte_aucun: "oui" } },
    step: "p2_contextes_complementaires",
  },
  {
    id: "TR-URGENCY-1",
    from: { distance: 2 },
    to: { urgency: "Autre urgence médicale attestée" },
    step: "p2_transport_urgence",
  },
  {
    id: "TR-URGENCY-2",
    from: { distance: 2, urgency: "Autre urgence médicale attestée" },
    to: { urgency: "Non" },
    step: "p2_transport_urgence",
  },
  {
    id: "TR-URGENCY-3",
    from: { urgency: "Appel au SAMU - Centre 15" },
    to: { urgency: "Non" },
    step: "p2_transport_urgence",
  },
  {
    id: "TR-NUMBER-1",
    from: { distance: 1 },
    to: { count: 4 },
    step: "p2_nombre_transports_prevus",
  },
  {
    id: "TR-NUMBER-2",
    from: { distance: 1, count: 4 },
    to: { count: 1 },
    step: "p2_nombre_transports_prevus",
  },
  {
    id: "TR-DIST-1",
    from: { count: 4, distance: 0 },
    to: { distance: 1 },
    step: "p2_tranche_distance_trajet_aller",
  },
  {
    id: "TR-DIST-2",
    from: { count: 4, distance: 1 },
    to: { distance: 0 },
    step: "p2_tranche_distance_trajet_aller",
  },
  {
    id: "TR-DIST-3",
    to: { distance: 2 },
    step: "p2_tranche_distance_trajet_aller",
  },
  {
    id: "TR-DIST-4",
    from: { distance: 2 },
    to: { distance: 0 },
    step: "p2_tranche_distance_trajet_aller",
  },
  {
    id: "TR-ORG-1",
    from: { count: 4, distance: 1 },
    to: { organization: "aller-retour différent" },
    step: "p2_organisation_transports",
  },
  {
    id: "TR-ORG-2",
    from: { count: 4, distance: 1, organization: "aller-retour différent" },
    to: { organization: "aller-retour identique" },
    step: "p2_organisation_transports",
  },
  { id: "TR-ADDR-1", to: { depart: "EHPAD" }, step: "p2_trajet_depart" },
  {
    id: "TR-ADDR-2",
    from: { depart: "Structure de soins" },
    to: { arrival: "Domicile" },
    step: "p2_trajet_arrivee",
  },
  {
    id: "TR-ADDR-3",
    to: {
      overrides: {
        p2_arrivee_nom_lieu: "'Centre Gamma'",
        p2_arrivee_adresse: "'7 rue du Port'",
        p2_arrivee_code_postal: "'44000'",
        p2_arrivee_commune: "'Nantes'",
      },
    },
    step: "page_adresse_arrivee",
  },
  {
    id: "TR-TRANSFER-1",
    from: { reason: TRANSFERT, ...STRUCTURES },
    to: { nature: "Définitif" },
    step: "p2_nature_transfert",
  },
  {
    id: "TR-TRANSFER-2",
    from: { reason: TRANSFERT, ...STRUCTURES },
    to: { exceptions: { p2_exception_ehpad: "oui" }, depart: "EHPAD" },
    step: "p2_exceptions_assurance_maladie",
  },
  {
    id: "TR-TRANSFER-3",
    from: {
      reason: TRANSFERT,
      exceptions: { p2_exception_ehpad: "oui" },
      depart: "EHPAD",
      arrival: "Structure de soins",
    },
    to: {
      exceptions: { p2_exception_aucune: "oui" },
      depart: "Structure de soins",
    },
    step: "p2_exceptions_assurance_maladie",
  },
  { id: "TR-NOOP-1", from: { distance: 2 }, step: "p2_transport_urgence" },
];
