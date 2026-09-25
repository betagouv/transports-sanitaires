// Le message d'erreur d'une saisie refusée, affiché sous le champ.
//
// Trois saisies en portent un : le total d'une DAP de permission (TS973-09)
// et les deux précisions médicales (TS973-15). Une page qui porte une saisie
// en erreur ne se valide pas (`passation.ts`). Sans message, le prescripteur
// verrait un bouton grisé sans savoir pourquoi. La saisie reste telle qu'il
// l'a tapée : le message dit quoi corriger, il ne corrige rien.

import type { Situation } from "publicodes";
import {
  allersRetoursIdentiques,
  capaciteDeLaDap,
  causeDeRefus,
} from "../nombre-permission-dap";
import {
  type ClePrecision,
  type RefusDeLaPrecision,
  refusDeLaPrecision,
} from "../precision-medicale";

/** Le message à afficher sous ce champ, ou `undefined` si sa saisie convient. */
export function saisieACorriger(
  id: string,
  situation: Situation<string>,
): string | undefined {
  if (id === "p2_motif_detail" || id === "p2_transfert_motif_detail")
    return messageDeLaPrecision(id, refusDeLaPrecision(id, situation));
  if (id !== "p2_nombre_transports_permission_dap") return undefined;
  switch (causeDeRefus(situation)) {
    case "pas un entier":
      return "Indiquez un nombre entier de trajets, au moins 1.";
    case "impair":
      return "Des allers-retours identiques comptent un nombre pair de trajets : un aller et un retour par permission.";
    case "au-dela de la capacite":
      return messageDeCapacite(situation);
    default:
      return undefined;
  }
}

// ---- implémentation ----

function messageDeLaPrecision(
  id: ClePrecision,
  refus: RefusDeLaPrecision | undefined,
): string | undefined {
  switch (refus) {
    case "generique":
      return id === "p2_motif_detail"
        ? "Précisez la consultation, l’examen ou le soin : ce libellé ne dit que la raison du déplacement."
        : "Précisez l’examen ou le soin qui motive ce transfert.";
    case "seance non declaree":
      return "Cette séance n’est pas déclarée dans la partie médicale. Choisissez une autre précision, ou refaites une simulation pour la déclarer.";
    case "trop longue":
      return "La précision tient en 500 caractères au plus.";
    default:
      return undefined;
  }
}

function messageDeCapacite(situation: Situation<string>): string {
  const capacite = capaciteDeLaDap(situation);
  if (capacite === 0)
    return "La période, la fréquence ou les dates de permission ne permettent aucun trajet. Vérifiez-les.";
  const parAllerRetour = allersRetoursIdentiques(situation)
    ? " Un aller-retour compte deux trajets."
    : "";
  return `La période, la fréquence mensuelle et les sens couverts permettent au plus ${capacite} trajets.${parAllerRetour}`;
}
