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
import type { Situation } from "publicodes";
import { avecEntreesCalculees } from "../entrees-calculees";
import { moteur } from "../moteur";
import { avecLieuInvalide } from "./invalidation-lieu";
import { pagesDuParcours } from "./pagination";

/**
 * L'état du formulaire, ses entrées calculées reversées et sa suite revue.
 *
 * `situationPrecedente` (déjà passée par `avecEntreesCalculees`, cf.
 * `passation.ts`) sert à TS973-11 : quand le lieu déduit change de type entre
 * deux saisies, l'adresse répondue pour l'ancien type est retirée.
 */
export function avecCalculs(
  etat: FormState<string>,
  situationPrecedente?: Situation<string>,
): FormState<string> {
  const situation = avecEntreesCalculees(etat.situation);
  // Une seule position pour la situation courante ici : `computeNextFields`
  // en a besoin de toute façon, et la reprendre pour la vérification TS973-11
  // uniquement doublerait ce coût précis à chaque saisie, la plus fréquente
  // du parcours (le rendu, lui, repositionne déjà `moteur` par ailleurs pour
  // ses propres besoins, cf. `ChampsDePage.tsx`). `avecLieuInvalide` garantit
  // `moteur` positionné sur ce qu'elle renvoie, donc rien à repositionner
  // après l'appel.
  const positionne = moteur.setSituation(situation);
  const situationFinale = situationPrecedente
    ? avecLieuInvalide(positionne, situation, situationPrecedente)
    : situation;
  return {
    ...etat,
    situation: situationFinale,
    nextPages: pagesDuParcours(computeNextFields(moteur, etat)),
  };
}
