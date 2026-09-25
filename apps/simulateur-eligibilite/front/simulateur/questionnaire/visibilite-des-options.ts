// Les options d'un choix unique qui ne s'affichent que sous condition, selon
// l'`option_visibility` du contrat d'interface : `p2_raison_principale` cache
// les trois séances tant que la Partie 1 ne les a pas déclarées. Le filtre qui
// s'en sert vit dans `ChampsDePage.tsx`.
//
// Les deux précisions médicales en faisaient autant jusqu'en v9.7.2. Ce sont
// des saisies directes depuis la v9.7.3 : leurs séances deviennent des
// suggestions, filtrées dans `precision-medicale.ts`.

import type { CleDeRegle } from "../contrat-regles-publicodes";

/** Libellé d'option → règle booléenne qui doit être vraie pour l'afficher. */
export type OptionsVisibles = Record<string, CleDeRegle>;

/** Les options conditionnelles de cette question, si le contrat en déclare. */
export function optionsVisiblesDe(id: string): OptionsVisibles | undefined {
  return TABLE[id as CleDeRegle];
}

/** Les trois séances, et la déclaration de la Partie 1 que chacune exige. */
export const SEANCES: OptionsVisibles = {
  "Séance de chimiothérapie": "p1_m0_seance_chimiotherapie",
  "Séance de radiothérapie": "p1_m0_seance_radiotherapie",
  "Séance de dialyse en centre, notamment d’hémodialyse":
    "p1_m0_seance_dialyse_centre",
};

// ---- implémentation ----

const TABLE: Partial<Record<CleDeRegle, OptionsVisibles>> = {
  p2_raison_principale: SEANCES,
};
