// Le recalcul du parcours après une saisie.
//
// `@publicodes/forms` recalcule déjà la suite à chaque `handleInputChange` : il
// demande au moteur ses variables manquantes, et les pagine. Ce module ajoute le
// geste que la v9.7 impose avant ce calcul — reverser au modèle les onze entrées
// que l'application calcule (`../entrees-calculees.ts`).
//
// Sans lui, ces entrées figureraient parmi les variables manquantes et le
// questionnaire les poserait comme des questions. Elles n'ont pas d'énoncé : le
// parcours administratif s'ouvrait sur « p2_permission_duree_heures », une saisie
// muette dont personne ne pouvait deviner ce qu'elle attendait.

import type { FormState } from "@publicodes/forms";
import { computeNextFields } from "@publicodes/forms";
import { avecEntreesCalculees } from "../entrees-calculees";
import { moteur } from "../moteur";
import { pagesDuParcours } from "./pagination";

/** L'état du formulaire, ses entrées calculées reversées et sa suite revue. */
export function avecCalculs(etat: FormState<string>): FormState<string> {
  const situation = avecEntreesCalculees(etat.situation);
  moteur.setSituation(situation);
  return {
    ...etat,
    situation,
    nextPages: pagesDuParcours(computeNextFields(moteur, etat)),
  };
}
