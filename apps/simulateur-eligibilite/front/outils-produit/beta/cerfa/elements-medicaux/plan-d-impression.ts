// Le partage entre le champ et l'annexe, décidé par une mesure réelle de la
// zone PDF — jamais par un seuil en caractères. Réencodage de
// `medicalPrintPlan` (`tmp/9.7.1/src/medical-text.mjs`) : la mesure vient de
// `annexe.ts` (décision 6 de la spec 0005), ce module reste pur.

import { RENVOI_A_L_ANNEXE, TITRE_DE_L_ANNEXE } from "./libelles.ts";

export type Plan = {
  readonly texteDuChamp: string;
  readonly annexe: { readonly titre: string; readonly texte: string } | null;
};

/**
 * `tient` mesure si une valeur entre dans la zone réelle du champ, avec la
 * police et la taille qui composeront son apparence — cf. `tientDansLaZone`
 * dans `annexe.ts`. Lève si le renvoi lui-même ne tient pas : un échec
 * technique explicite vaut mieux qu'une impression trompeuse.
 */
export function planDImpression(
  texte: string,
  tient: (valeur: string) => boolean,
): Plan {
  if (texte === "" || tient(texte)) {
    return { texteDuChamp: texte, annexe: null };
  }
  if (!tient(RENVOI_A_L_ANNEXE)) {
    throw new RangeError(
      "Le renvoi à l’annexe ne tient pas dans la zone médicale.",
    );
  }
  return {
    texteDuChamp: RENVOI_A_L_ANNEXE,
    annexe: { titre: TITRE_DE_L_ANNEXE, texte },
  };
}
