// Sélection d'identification produite par le formulaire (identifiants métier
// bruts). Elle n'est jamais transmise telle quelle au simulateur : le backend la
// convertit en contexte pseudonymisé (voir server/contexte.ts + ADR-4).

/** Convention pour un prescripteur absent du référentiel (ADR §4). */
export const PRESCRIPTEUR_AUTRE = "p_autre";

export type Selection = {
  etabId: string;
  serviceId: string;
  prescripteurId: string;
};
