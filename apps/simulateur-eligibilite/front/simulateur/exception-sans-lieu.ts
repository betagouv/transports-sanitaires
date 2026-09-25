// Une exception EHPAD ou USLD cochée alors que ni le départ ni l'arrivée ne
// sont de ce type (TS973-07, famille AUD-ROUTE-EXCEPTION-PLACE).
//
// Deux lecteurs : la garde `p2_exceptions_trajet_valides`
// (`entrees-calculees.ts`), qui bloque le résultat, et l'écran de résultat, qui
// dit au prescripteur quelle réponse corriger.

import type { Situation } from "publicodes";
import type { CleDeRegle } from "./contrat-regles-publicodes";
import { lecteurs } from "./lecture-de-situation";

type ExceptionDeLieu = "EHPAD" | "USLD";

/** Un bout du trajet : son type effectif, et s'il est déduit plutôt que répondu. */
type LieuDuTrajet = { type: string; deduit: boolean };

export type ExceptionSansLieu = {
  exception: ExceptionDeLieu;
  depart: LieuDuTrajet;
  arrivee: LieuDuTrajet;
};

/** L'exception qu'aucun lieu du trajet ne justifie, ou `undefined`. */
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

// La comparaison porte sur le type de lieu, jamais sur l'adresse : aucun
// référentiel ne dit qu'une adresse est un EHPAD. Et sur le type **effectif** :
// un type répondu puis masqué par une déduction (admission HAD, retour
// pénitentiaire) reste dans la situation, mais ne décrit plus le trajet.
function lieuEffectif(
  situation: Situation<string>,
  bout: "depart" | "arrivee",
): LieuDuTrajet {
  const deduit = typeDeduit(situation, bout);
  if (deduit) return { type: deduit, deduit: true };
  return { type: lecteurs(situation).lu(`p2_trajet_${bout}`), deduit: false };
}

// Réencodage de `placeType` (v9.7.3, `src/application.mjs`), dans l'ordre de
// priorité de `p2_lieu_depart_type_effectif` et `p2_lieu_arrivee_type_effectif`
// (regles.publicodes).
function typeDeduit(
  situation: Situation<string>,
  bout: "depart" | "arrivee",
): string | undefined {
  const { lu, vrai } = lecteurs(situation);
  const raison = lu("p2_raison_principale");
  if (vrai("p2_exception_admission_had"))
    return bout === "depart" ? "Structure de soins" : "Domicile";
  if (
    vrai("p2_exception_retour_penitentiaire") ||
    vrai("p2_contexte_retour_penitentiaire")
  )
    return bout === "depart"
      ? "Structure de soins"
      : "Établissement pénitentiaire";
  if (bout === "depart")
    return raison === "Sortie d’hospitalisation"
      ? "Structure de soins"
      : undefined;
  return raison === "Entrée en hospitalisation" ||
    raison === "Transport vers un service d’urgences"
    ? "Structure de soins"
    : undefined;
}
