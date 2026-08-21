// D'une situation du simulateur aux saisies du CERFA.
//
// Ce module ne décide de rien : il vérifie que le document s'applique, puis
// parcourt `remplissage-pmt.ts` champ par champ. Tout ce qui relève du « comment
// se remplit tel champ » est là-bas, à côté du nom du champ.

import type Engine from "publicodes";
import type { Situation } from "publicodes";
import type { Saisie } from "./remplir-cerfa.ts";
import type { Valeur } from "./remplissage-pmt.ts";
import { REMPLISSAGE_PMT } from "./remplissage-pmt.ts";
import { reponsesDe } from "./reponses.ts";

/** Levée quand la situation ne conduit pas à ce CERFA (autre document, ou aucun). */
export class CerfaNonApplicable extends Error {
  readonly casFinal: string;

  constructor(casFinal: string) {
    super(
      `Ce CERFA ne s'applique pas : le simulateur conclut à « ${casFinal} », ` +
        `et non à « prescription médicale de transport ».`,
    );
    this.name = "CerfaNonApplicable";
    this.casFinal = casFinal;
  }
}

/**
 * Déduit les saisies CERFA que le simulateur sait justifier, pour `situation`.
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
    throw new CerfaNonApplicable(casFinal);

  return Object.entries(REMPLISSAGE_PMT).flatMap(([champ, remplir]) =>
    saisieDe(champ, remplir(réponses)),
  );
}

// ---- implémentation ----

// Un champ laissé à quelqu'un et un champ sans objet laissent tous deux le PDF
// vierge : la distinction est faite pour qui lit le tableau, pas pour l'écriture.
function saisieDe(champ: string, valeur: Valeur): Saisie[] {
  if (valeur === undefined || "laisséÀ" in valeur) return [];
  return [{ champ, ...valeur }];
}
