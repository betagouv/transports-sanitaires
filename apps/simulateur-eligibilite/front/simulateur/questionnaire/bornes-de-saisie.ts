// Les bornes d'une saisie numérique, telles que le contrat d'interface les
// déclare.
//
// Elles vivaient dans le modèle jusqu'en v9.5.1, sous une clé `saisie` que le
// moteur n'interprétait pas — l'interface allait la lire dans les règles brutes,
// comme elle lit encore `mosaique`. La v9.7 les a déplacées : le modèle ne porte
// plus aucune borne, et c'est `ui.inputs` qui dit le minimum, le maximum et le
// pas de chaque question chiffrée.
//
// Ce fichier en est la recopie. Comme `etapes.ts`, il tient d'un côté ce que le
// livrable dit de l'autre, et `tests/simulateur/bornes-de-saisie.test.tsx` garde
// les deux en vis-à-vis : une question chiffrée sans bornes déclarées y échoue.

import type { CleDeRegle } from "../contrat-regles-publicodes";

export type Bornes = {
  /** Plus petite valeur acceptée. */
  min?: number;
  /** Plus grande valeur acceptée. */
  max?: number;
  /** Écart entre deux valeurs acceptées ; `1` pour un entier. */
  pas?: number;
};

/**
 * Les bornes que le contrat déclare pour cette question. Vides quand il n'en
 * déclare pas : rien ne contraint alors la saisie, et l'interface s'en garde
 * autant — inventer une borne ferait refuser à l'écran ce que le modèle accepte.
 */
export function bornesDeSaisie(id: string): Bornes {
  return BORNES[id as CleDeRegle] ?? {};
}

// ---- implémentation ----

// Les quatre questions chiffrées de la v9.7, avec les bornes du contrat. Toutes
// sont entières et valent au moins un transport ; seule la fréquence mensuelle
// d'une permission porte un plafond — au plus un aller-retour par semaine, soit
// cinq selon le calendrier.
const BORNES: Partial<Record<CleDeRegle, Bornes>> = {
  p2_nombre_transports_prevus: { min: 1, pas: 1 },
  p2_nombre_transports_couvert_simulation: { min: 1, pas: 1 },
  p2_nombre_transports_permission_dap: { min: 1, pas: 1 },
  p2_permission_ar_par_mois: { min: 1, max: 5, pas: 1 },
};
