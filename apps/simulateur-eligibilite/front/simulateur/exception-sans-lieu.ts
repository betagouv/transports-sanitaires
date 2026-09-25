// Une exception EHPAD ou USLD cochée alors que ni le départ ni l'arrivée ne
// sont de ce type (TS973-07, famille AUD-ROUTE-EXCEPTION-PLACE).
//
// Deux lecteurs : la garde `p2_exceptions_trajet_valides`
// (`entrees-calculees.ts`), qui bloque le résultat, et l'écran de résultat, qui
// dit au prescripteur quelle réponse corriger.

import type { Situation } from "publicodes";
import type { CleDeRegle } from "./contrat-regles-publicodes";
import { lecteurs } from "./lecture-de-situation";
import { type LieuDuTrajet, lieuEffectif } from "./lieu-effectif";

type ExceptionDeLieu = "EHPAD" | "USLD";

export type ExceptionSansLieu = {
  exception: ExceptionDeLieu;
  depart: LieuDuTrajet;
  arrivee: LieuDuTrajet;
};

/**
 * L'exception qu'aucun lieu du trajet ne justifie, ou `undefined`. La
 * comparaison porte sur le type de lieu effectif, jamais sur l'adresse : aucun
 * référentiel ne dit qu'une adresse est un EHPAD.
 */
export function exceptionSansLieu(
  situation: Situation<string>,
): ExceptionSansLieu | undefined {
  const { vrai } = lecteurs(situation);
  const depart = lieuEffectif(situation, "depart");
  const arrivee = lieuEffectif(situation, "arrivee");
  for (const [exception, cle] of EXCEPTIONS)
    if (vrai(cle) && depart.type !== exception && arrivee.type !== exception)
      return { exception, depart, arrivee };
  return undefined;
}

// ---- implémentation ----

const EXCEPTIONS: readonly (readonly [ExceptionDeLieu, CleDeRegle])[] = [
  ["EHPAD", "p2_exception_ehpad"],
  ["USLD", "p2_exception_usld"],
];
