// Ce que le produit mesure : le vocabulaire complet des événements du simulateur,
// et le seul module que le reste de l'app importe pour tracer. Le transport (tag
// Matomo, file `_paq`) est derrière, dans `matomo.ts`.
//
// Voir docs/architecture/analytics.md.

import { emettre } from "./matomo";

export const trackSimulationStart = (outil?: string): void =>
  emettre(prefixe(outil, "simulation_start"));

export const trackSimulationStep = (stepIndex: number, outil?: string): void =>
  emettre(prefixe(outil, "simulation_step"), stepIndex);

export const trackSimulationComplete = (outil?: string): void =>
  emettre(prefixe(outil, "simulation_complete"));

export const trackSimulationAbandon = (
  lastStep: number,
  outil?: string,
): void => emettre(prefixe(outil, "simulation_abandon"), lastStep);

export const trackResultat = (statut: string, outil?: string): void =>
  emettre(prefixe(outil, `resultat:${statut}`));

/**
 * Téléchargement d'un CERFA pré-rempli : mesure l'usage réel du document produit
 * en fin de parcours. Émis par le secrétariat uniquement (seul outil qui l'expose).
 *
 * `formulaire` sépare les deux documents — une prescription médicale de transport
 * et une demande d'accord préalable ne racontent pas le même parcours, et les
 * confondre en un seul compteur ferait perdre la seule chose qu'on cherche à voir.
 */
export const trackCerfaTelecharge = (formulaire: string): void =>
  emettre(prefixe("secretariat", `cerfa_telecharge:${formulaire}`));

// ---- implémentation ----

// Préfixe l'action par l'outil émetteur (`prescripteur` / `secretariat`) pour
// séparer les tunnels dans Matomo. Sans outil, l'action reste inchangée.
function prefixe(outil: string | undefined, action: string): string {
  return outil ? `${outil}:${action}` : action;
}
