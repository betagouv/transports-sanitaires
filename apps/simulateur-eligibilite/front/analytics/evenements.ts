// La liste des évènements Matomo. C'est le seul module que l'app importe pour
// tracer. L'envoi est dans `matomo.ts`.
// Voir docs/knowledge/adr/analytics.md.

import { emettre } from "./matomo";

/**
 * Référentiel des évènements Matomo : chaque nom est fixe, jamais composé à la
 * volée. `trackEvenement` ci-dessous refuse à la compilation tout nom qui n'en
 * soit pas une valeur exacte.
 *
 * Il ne porte que le parcours : son début, ses étapes, sa conclusion, son
 * abandon. Les résultats et les documents y reviendront avec le modèle qui les
 * définit.
 *
 * Un objet `as const`, pas un `enum` : `erasableSyntaxOnly` (tsconfig) interdit
 * l'`enum`, qui engendre du code non effaçable à la compilation.
 */
export const NomEvenement = {
  simulationStart: "simulation_start",
  simulationStep: "simulation_step",
  simulationComplete: "simulation_complete",
  simulationAbandon: "simulation_abandon",
} as const;

/**
 * Émet un évènement Matomo : le seul point d'entrée du reste de l'app pour
 * tracer. `nom` doit être une valeur exacte de `NomEvenement` : un nom composé
 * au moment de l'appel (gabarit de chaîne, concaténation) ne compile pas.
 */
export function trackEvenement(
  nom: (typeof NomEvenement)[keyof typeof NomEvenement],
  valeur?: number,
): void {
  emettre(nom, valeur);
}
