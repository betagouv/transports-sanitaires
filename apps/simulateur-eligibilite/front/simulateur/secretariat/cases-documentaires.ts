// Ce que le Bloc 3 liste au corps médical, par cas final.
//
// Trois cas finaux ouvrent un Cerfa, et leurs cases viennent désormais du modèle :
// le YAML documentaire de la v9.7 dit, pour chaque zone des trois formulaires,
// quelle règle la décide (`rubriques-du-pmt.ts`, `rubriques-de-la-dap.ts`,
// `rubriques-du-s3141.ts`). Jusqu'ici l'application dérivait ces cases elle-même
// des critères médicaux et du libellé du mode, et se trompait : une position
// allongée se listait sans ambulance, un TPMR ne cochait pas le transport assis
// professionnalisé, et le SAMSAH réclamait une case qui n'existe sur aucun
// formulaire.
//
// Les quatre autres cas finaux n'ouvrent aucun formulaire : il n'y a rien à
// cocher, seulement des éléments à vérifier avant de remettre le document — ou
// rien du tout.

import type { moteur } from "../moteur";
import type { GroupeRetenu, Rubrique } from "./case-de-formulaire";
import { rubriquesRetenues } from "./case-de-formulaire";
import { RUBRIQUES_DAP } from "./rubriques-de-la-dap";
import { RUBRIQUES_PMT } from "./rubriques-du-pmt";
import { RUBRIQUES_S3141 } from "./rubriques-du-s3141";

/**
 * Les cases du cas final, réduites à ce que la simulation a établi. Le mode de
 * transport n'est plus un paramètre : le modèle expose ses propres cibles de
 * mode, et c'est à elles que le formulaire se réfère.
 */
export function casesRetenues(
  casFinal: string,
  e: typeof moteur,
): GroupeRetenu[] {
  const cerfa = CERFA[casFinal];
  if (cerfa) return rubriquesRetenues(cerfa, e);
  return [...(A_VERIFIER[casFinal] ?? [])];
}

// ---- implémentation ----

// Les trois formulaires, et le cas final qui les ouvre. Le livrable choisit de
// la même façon : S3141, puis DAP, puis PMT.
const CERFA: Record<string, readonly Rubrique[]> = {
  "prescription S3141": RUBRIQUES_S3141,
  "demande d’accord préalable": RUBRIQUES_DAP,
  "prescription médicale de transport": RUBRIQUES_PMT,
};

// Les cas finaux sans formulaire. Rien ne s'y coche, donc rien ne s'y évalue :
// ce sont des listes de vérification, tenues à la main.
const A_VERIFIER: Record<string, readonly GroupeRetenu[]> = {
  "convocation ou avis d’audience": [
    {
      titre: "Éléments à vérifier",
      icone: "fr-icon-checkbox-circle-line",
      cases: [
        "Type de convocation ou d’avis.",
        "Mode de transport indiqué ou validé.",
        "Identité du patient.",
        "Date et lieu de convocation.",
        "Cohérence avec le transport sanitaire prescrit.",
      ],
    },
  ],
  "transport à la charge de l’établissement": [
    {
      titre: "Assurez-vous que ces éléments soient complétés",
      icone: "fr-icon-checkbox-line",
      cases: [
        "Patient hospitalisé au moment du transport.",
        "Absence d’exception restant Assurance Maladie.",
        "Type de transport établissement.",
        "Départ.",
        "Arrivée.",
        "Date du transport.",
        "Transport sanitaire prescrit.",
        "Formulaire ou procédure interne de l’établissement.",
      ],
    },
  ],
  "permission de sortie sans motif médical": [],
  "non éligible à une prise en charge par l’Assurance Maladie": [],
};
