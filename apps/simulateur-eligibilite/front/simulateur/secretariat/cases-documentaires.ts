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
// Les cinq autres cas finaux n'ouvrent aucun formulaire : il n'y a rien à
// cocher, seulement des éléments à vérifier avant de remettre le document — ou
// rien du tout.

import { faux, type moteur, texte, vrai } from "../moteur";
import type { GroupeRetenu, Lecteur, Rubrique } from "./case-de-formulaire";
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
  if (cerfa) return rubriquesRetenues(cerfa, lecteurDuMoteur(e));
  return [...(A_VERIFIER[casFinal] ?? [])];
}

// ---- implémentation ----

// Le secrétariat évalue contre le singleton de `front/simulateur/moteur.ts` ;
// `rubriquesRetenues` ne connaît, elle, que le `Lecteur` de
// `case-de-formulaire.ts` — c'est ce qui lui permet d'être partagée avec le
// Cerfa, dont l'`Engine` est un autre.
function lecteurDuMoteur(e: typeof moteur): Lecteur {
  return {
    texte: (cle) => texte(e, cle),
    vrai: (cle) => vrai(e, cle),
    faux: (cle) => faux(e, cle),
  };
}

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
  // Texte livré mot pour mot (contrat v9.7.2, `checks_to_perform`).
  "orientation vers la caisse pour accord préalable": [
    {
      titre: "Éléments à vérifier",
      icone: "fr-icon-checkbox-circle-line",
      cases: [
        "Vérifier que la convocation ou l’avis d’audience mentionne le mode de transport adapté.",
        "Confirmer les caractéristiques du trajet : avion ou bateau de ligne régulière et distance aller.",
        "Contacter la caisse avec la convocation et la synthèse pour confirmer la procédure, les pièces nécessaires et la personne qui doit établir la demande.",
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
