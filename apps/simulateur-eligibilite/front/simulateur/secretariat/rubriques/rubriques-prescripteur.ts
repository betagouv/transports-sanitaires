// Le bloc prescripteur et structure, recopié du YAML documentaire de la v9.7 :
// l'identité du prescripteur, la date de prescription, la signature, le cadre
// transporteur et — sur la DAP seulement — l'avis de la caisse.
//
// Aucune de ces lignes n'a rien à dire à la checklist : l'identité est
// `externe` (le référentiel d'identification ne porte que des libellés), la
// date de prescription est posée par l'application hors du moteur
// (`date-de-prescription.ts`, qui rappelle que « le moteur ne lit jamais une
// date système implicite »), et la signature, le cadre transporteur et l'avis
// de la caisse sont `manuel` — remplis à la main sur le papier.

import type { CaseDeFormulaire } from "../case-de-formulaire.ts";

/** Sur les trois formulaires : le référentiel ne porte que des libellés. */
export const IDENTITE_PRESCRIPTEUR_ET_STRUCTURE: readonly CaseDeFormulaire[] = [
  { id: "prescripteur_nom_prenom", origine: "externe" },
  { id: "prescripteur_rpps", origine: "externe" },
  { id: "structure_nom", origine: "externe" },
  { id: "structure_adresse", origine: "externe" },
  { id: "structure_identifiant", origine: "externe" },
];

/** La date à laquelle le prescripteur arrive sur le Résultat 2. */
export const DATE_PRESCRIPTION: readonly CaseDeFormulaire[] = [
  { id: "date_prescription", origine: "application" },
];

/** Sur les trois formulaires. */
export const SIGNATURE_PRESCRIPTEUR: readonly CaseDeFormulaire[] = [
  { id: "signature_prescripteur", origine: "manuel" },
];

/** Sur les trois formulaires : identification, facture et signature. */
export const CADRE_TRANSPORTEUR: readonly CaseDeFormulaire[] = [
  {
    id: "cadre_transporteur",
    origine: "manuel",
    destinataire: "le transporteur",
  },
];

/** Sur la DAP seulement : les volets 1 et 2. */
export const AVIS_CAISSE: readonly CaseDeFormulaire[] = [
  { id: "avis_caisse", origine: "manuel", destinataire: "la caisse" },
];
