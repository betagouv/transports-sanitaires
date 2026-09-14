// D'une situation du simulateur aux saisies de la prescription S3141. Le garde,
// et rien d'autre : le « comment se remplit tel champ » est dans
// `remplissage-s3141.ts`, à côté du nom du champ.

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import { CerfaNonApplicable } from "../cerfa-non-applicable.ts";
import type { Saisie } from "../remplir-cerfa.ts";
import { saisiesDuTableau } from "../remplissage.ts";
import { reponsesDe } from "../reponses.ts";
import { REMPLISSAGE_S3141 } from "./remplissage-s3141.ts";

/**
 * Déduit les saisies que le simulateur sait justifier, pour `situation`.
 *
 * Ne rend **que** ce qui est déduit des règles. Un champ absent du résultat est un
 * champ que le prescripteur remplira lui-même — `remplissage-s3141.ts` dit lequel
 * et pourquoi, décisions 3 et 4 de la spec 0009 comprises.
 *
 * @throws {CerfaNonApplicable} si le cas final n'est pas une prescription S3141 —
 * une prescription ordinaire relève du PMT, un accord préalable de la DAP.
 */
export function saisiesDepuisSituation(
  moteur: Engine<string>,
  situation: Situation<string>,
): Saisie[] {
  const réponses = reponsesDe(moteur, situation);
  const casFinal = réponses.texte("cible_cas_final");
  if (casFinal !== "prescription S3141")
    throw new CerfaNonApplicable(casFinal, "prescription S3141");
  return saisiesDuTableau(REMPLISSAGE_S3141, réponses);
}
