// L'urgence, le volet médical et l'exonération du ticket modérateur, recopiés du
// YAML documentaire de la v9.7. Communs au PMT et à la DAP ; le S3141 n'a ni
// urgence ni volet médical, le livrable le répète deux fois : « aucune rubrique
// éléments médicaux, urgence ou centre de référence sur S3141 », « ne pas en
// créer ». L'exonération, elle, est commune aux trois formulaires.

import type { CaseDeFormulaire } from "../case-de-formulaire.ts";

/** L'urgence, sur le PMT et la DAP seulement. */
export const URGENCE: readonly CaseDeFormulaire[] = [
  {
    id: "urgence_appel15",
    libelle: "Urgence : appel du SAMU — centre 15.",
    source: "cible_urgence_appel15",
  },
  {
    id: "urgence_autre",
    libelle: "Urgence : autre urgence médicale attestée.",
    source: "cible_urgence_autre",
  },
  {
    id: "urgence_precision",
    libelle: "Nature de l’urgence",
    source: "cible_urgence_autre_precision",
    rendu: "texte",
    quand: { toutes: ["cible_urgence_autre"] },
  },
];

/**
 * Le volet médical du PMT et de la DAP. Le livrable insiste : « volet 1
 * exclusivement, aucune copie » sur les volets suivants.
 *
 * Les éléments d'ordre médical sont composés par l'application selon le
 * contrat EM-2 (EM-1 livré en v9.7.1, remplacé en v9.7.3), plutôt que lus sur
 * une règle unique : la ligne reste d'origine `application`, sans `source`,
 * mais porte `composition: "EM-2"`, cf. spec 0005. Sans `libelle`, la
 * checklist du Bloc 3 continue de l'ignorer : c'est
 * `outils-produit/beta/cerfa/mapping.ts` qui relit `composition` pour le
 * pré-remplissage.
 */
export const VOLET_MEDICAL: readonly CaseDeFormulaire[] = [
  {
    id: "elements_medicaux",
    origine: "application",
    rendu: "texte",
    composition: "EM-2",
  },
  {
    id: "centre_rare",
    libelle:
      "Transport vers un autre centre de référence dédié aux maladies rares.",
    source: "cible_situation_centre_reference_maladies_rares",
  },
];

/** Sur les trois formulaires, mêmes deux cases. */
export const EXONERATION_DU_TICKET_MODERATEUR: readonly CaseDeFormulaire[] = [
  {
    id: "exoneration_oui",
    libelle:
      "Cas particulier d’exonération du ticket modérateur : cocher « Oui ».",
    source: "cible_exoneration_ticket_moderateur",
  },
  {
    id: "exoneration_non",
    libelle:
      "Cas particulier d’exonération du ticket modérateur : cocher « Non ».",
    source: "cible_exoneration_ticket_moderateur",
    rendu: "case Non",
  },
];
