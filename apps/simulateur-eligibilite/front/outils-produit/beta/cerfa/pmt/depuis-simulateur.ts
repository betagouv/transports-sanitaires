// D'une situation du simulateur aux saisies de la prescription médicale de
// transport. Le garde, et rien d'autre : le « comment se remplit tel champ » est
// dans `remplissage-pmt.ts`, à côté du nom du champ.

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import { CerfaNonApplicable } from "../cerfa-non-applicable.ts";
import type { Saisie } from "../remplir-cerfa.ts";
import { saisiesDuTableau } from "../remplissage.ts";
import { reponsesDe } from "../reponses.ts";
import { REMPLISSAGE_PMT } from "./remplissage-pmt.ts";

/**
 * Déduit les saisies que le simulateur sait justifier, pour `situation`.
 *
 * Ne rend **que** ce qui est déduit des règles : aucune valeur inventée, aucun
 * défaut arbitraire. Un champ absent du résultat est un champ que le prescripteur
 * — ou le transporteur — renseignera lui-même, et `remplissage-pmt.ts` dit lequel.
 *
 * @throws {CerfaNonApplicable} si le cas final n'est pas une prescription médicale
 * de transport — un accord préalable relève du formulaire S3139, une prise en
 * charge par l'établissement ne donne pas lieu à ce CERFA du tout.
 */
export function saisiesDepuisSituation(
  moteur: Engine<string>,
  situation: Situation<string>,
): Saisie[] {
  const réponses = reponsesDe(moteur, situation);
  const casFinal = réponses.texte("cible_cas_final");
  if (casFinal !== "prescription médicale de transport")
    throw new CerfaNonApplicable(
      casFinal,
      "prescription médicale de transport",
    );
  return saisiesDuTableau(REMPLISSAGE_PMT, réponses);
}
