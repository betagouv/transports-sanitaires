// La migration que fait l'adaptateur v9.7.3 de l'éditeur (`answers()`,
// `tests/helpers.mjs`) sur les fixtures écrites pour la v9.7.2. Tenue à part
// de `livrable.ts`, qui traduit les options en réponses : ici, on
// ramène d'anciennes réponses au modèle actuel.

import type { Situation } from "publicodes";
import type { OptionsDuLivrable } from "./livrable";

/**
 * La migration des fixtures que fait l'adaptateur v9.7.3 (`answers()`,
 * `tests/helpers.mjs`) : le texte libre d'une ancienne saisie en deux écrans
 * devient la précision directe, et un retour pénitentiaire déjà explicite se
 * déclare parmi les exceptions d'un transfert. Les clés retirées du modèle
 * sont effacées : une clé inconnue fait lever le moteur.
 */
export function migree(
  situation: Situation<string>,
  options: OptionsDuLivrable,
): Situation<string> {
  const { overrides = {} } = options;
  const resultat: Situation<string> = { ...situation };
  if (
    overrides.p2_motif_detail === texte("Autre - préciser") ||
    overrides.p2_motif_detail_autre !== undefined
  )
    resultat.p2_motif_detail =
      overrides.p2_motif_detail_autre ?? texte("Examen de contrôle médical");
  if (
    overrides.p2_transfert_motif_detail === texte("Autre - préciser") ||
    overrides.p2_transfert_motif_autre !== undefined
  )
    resultat.p2_transfert_motif_detail =
      overrides.p2_transfert_motif_autre ??
      texte("IRM nécessitant le plateau technique destinataire");
  const transfert = options.transfer || options.reason?.startsWith("Transfert");
  if (
    transfert &&
    options.contexts?.p2_contexte_retour_penitentiaire === "oui"
  ) {
    resultat.p2_exception_retour_penitentiaire = "oui";
    resultat.p2_exception_aucune = "non";
  }
  for (const retiree of CLES_RETIREES) delete resultat[retiree];
  return resultat;
}

// ---- implémentation ----

const CLES_RETIREES = [
  "p2_motif_detail_autre",
  "p2_transfert_motif_autre",
  "p2_type_hospitalisation",
];

function texte(valeur: string): string {
  return `'${valeur}'`;
}
