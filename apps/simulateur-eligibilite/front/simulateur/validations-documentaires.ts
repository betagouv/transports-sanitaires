// `p2_validations_documentaires`, que le modèle attend de l'application :
// les saisies du prescripteur ont-elles une forme acceptable ? Réencodage de
// la boucle finale de `technicalSituation` (v9.7.3), pour trois familles :
// - les nombres, entiers d'au moins 1 (`DEC-NOMBRE-INVALIDE-*`) ;
// - les dates d'accident, qui existent au calendrier et ne sont pas futures ;
// - les précisions médicales demandées (`precision-medicale.ts`).
//
// Les dates d'une permission ont leurs propres gardes
// (`dates-de-permission.ts`). Une seed ou
// le labo qui pose une saisie refusée n'obtient aucun document.

import type { Situation } from "publicodes";
import type { CleDeRegle } from "./contrat-regles-publicodes";
import { jourValide } from "./heure-de-paris";
import {
  lecteurs,
  nombreSaisi,
  pasRepondu,
  texteBrut,
} from "./lecture-de-situation";
import { precisionsValides } from "./precision-medicale";

/** Les saisies répondues ont-elles une forme acceptable, `aujourdhui` en `YYYY-MM-DD` ? */
export function validationsDocumentaires(
  situation: Situation<string>,
  aujourdhui: string,
): boolean {
  return (
    nombresValides(situation) &&
    datesValides(situation, aujourdhui) &&
    precisionsValides(situation)
  );
}

// ---- implémentation ----

const NOMBRES: readonly CleDeRegle[] = [
  "p2_nombre_transports_prevus",
  "p2_nombre_transports_couvert_simulation",
  "p2_nombre_transports_permission_dap",
  "p2_permission_ar_par_mois",
];

// Chaque date avec le fait qui la fait poser (son `applicable si`) : une
// réponse restée sans ce fait ne compte pas.
const DATES: readonly (readonly [CleDeRegle, CleDeRegle])[] = [
  ["p2_date_at_mp", "p2_contexte_at_mp"],
  ["p2_date_accident_cause_par_tiers", "p2_accident_cause_par_tiers"],
];

function datesValides(situation: Situation<string>, aujourdhui: string) {
  const { vrai } = lecteurs(situation);
  return DATES.every(([cle, fait]) => {
    if (!vrai(fait) || pasRepondu(situation[cle])) return true;
    const jour = texteBrut(situation[cle]);
    return jourValide(jour) && jour <= aujourdhui;
  });
}

// Une saisie absente n'est pas refusée : c'est la complétude qui la réclame.
function nombresValides(situation: Situation<string>): boolean {
  return NOMBRES.every((cle) => {
    if (pasRepondu(situation[cle])) return true;
    const valeur = nombreSaisi(situation[cle]);
    return Number.isInteger(valeur) && valeur >= 1;
  });
}
