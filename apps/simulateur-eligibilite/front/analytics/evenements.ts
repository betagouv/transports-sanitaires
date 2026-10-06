// La liste des évènements Matomo. C'est le seul module que l'app importe pour
// tracer. L'envoi est dans `matomo.ts`.
// Voir docs/knowledge/adr/analytics.md.

import { emettre } from "./matomo";

/**
 * La liste des évènements Matomo. Chaque nom est fixe. `trackEvenement` refuse à
 * la compilation tout nom qui n'est pas dans la liste.
 *
 * Elle ne couvre que le questionnaire : son début, ses étapes, sa fin, son
 * abandon. Les résultats et les documents reviendront avec le prochain modèle.
 *
 * Un objet `as const`, pas un `enum` : `erasableSyntaxOnly` (tsconfig) interdit
 * l'`enum`.
 */
export const NomEvenement = {
  simulationStart: "simulation_start",
  simulationStep: "simulation_step",
  simulationComplete: "simulation_complete",
  simulationAbandon: "simulation_abandon",
} as const;

/**
 * Émet un évènement Matomo. C'est le seul point d'entrée de l'app pour tracer.
 * `nom` doit être une valeur exacte de `NomEvenement` : un nom composé à l'appel
 * ne compile pas.
 */
export function trackEvenement(
  nom: (typeof NomEvenement)[keyof typeof NomEvenement],
  valeur?: number,
): void {
  emettre(nom, valeur);
}
