// Le message d'erreur d'une saisie que le modèle refuse, affiché sous le champ.
//
// Le total d'une DAP de permission (TS973-09) est la seule saisie à en porter
// un. Son étape ne se valide pas tant que sa règle de complétude reste fausse
// (`etapes.ts`). Sans message, le prescripteur verrait un bouton grisé sans
// savoir pourquoi. La saisie reste telle qu'il l'a tapée : le message dit quoi
// corriger, il ne corrige rien.

import type { Situation } from "publicodes";
import {
  allersRetoursIdentiques,
  capaciteDeLaDap,
  causeDeRefus,
} from "../nombre-permission-dap";

/** Le message à afficher sous ce champ, ou `undefined` si sa saisie convient. */
export function saisieACorriger(
  id: string,
  situation: Situation<string>,
): string | undefined {
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

function messageDeCapacite(situation: Situation<string>): string {
  const capacite = capaciteDeLaDap(situation);
  if (capacite === 0)
    return "La période, la fréquence ou les dates de permission ne permettent aucun trajet. Vérifiez-les.";
  const parAllerRetour = allersRetoursIdentiques(situation)
    ? " Un aller-retour compte deux trajets."
    : "";
  return `La période, la fréquence mensuelle et les sens couverts permettent au plus ${capacite} trajets.${parAllerRetour}`;
}
