// D'une situation du simulateur aux saisies de la demande d'accord préalable. Le
// garde, et rien d'autre : le « comment se remplit tel champ » est dans
// `remplissage-dap.ts`, à côté du nom du champ.

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import { CerfaNonApplicable } from "../cerfa-non-applicable.ts";
import type { Saisie } from "../remplir-cerfa.ts";
import { saisiesDuTableau } from "../remplissage.ts";
import { reponsesDe } from "../reponses.ts";
import { REMPLISSAGE_DAP } from "./remplissage-dap.ts";

/**
 * Déduit les saisies que le simulateur sait justifier, pour `situation`.
 *
 * Ne rend **que** ce qui est déduit des règles. Un champ absent du résultat est un
 * champ que le prescripteur, le transporteur ou la caisse renseignera lui-même, et
 * `remplissage-dap.ts` dit lequel — c'est le propre de ce formulaire que d'en
 * réserver toute une rubrique à la caisse.
 *
 * @throws {CerfaNonApplicable} si le cas final n'est pas une demande d'accord
 * préalable — une prescription relève du formulaire S3138, une prise en charge par
 * l'établissement ne donne pas lieu à ce CERFA du tout.
 */
export function saisiesDepuisSituation(
  moteur: Engine<string>,
  situation: Situation<string>,
): Saisie[] {
  const réponses = reponsesDe(moteur, situation);
  const casFinal = réponses.texte("cible_cas_final");
  if (casFinal !== "demande d’accord préalable")
    throw new CerfaNonApplicable(casFinal, "demande d’accord préalable");
  return saisiesDuTableau(REMPLISSAGE_DAP, réponses);
}
