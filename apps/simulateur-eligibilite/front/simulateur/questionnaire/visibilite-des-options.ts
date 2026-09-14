// Les options d'un choix unique qui ne s'affichent que sous condition —
// `option_visibility` du contrat d'interface. Recopie de ses trois tables :
// `p2_raison_principale`, `p2_motif_detail` et `p2_transfert_motif_detail`
// cachent les mêmes trois séances tant que la Partie 1 ne les a pas
// déclarées. Le filtre qui s'en sert vit dans `ChampsDePage.tsx`.

import type { CleDeRegle } from "../contrat-regles-publicodes";

/** Libellé d'option → règle booléenne qui doit être vraie pour l'afficher. */
export type OptionsVisibles = Record<string, CleDeRegle>;

/** Les options conditionnelles de cette question, si le contrat en déclare. */
export function optionsVisiblesDe(id: string): OptionsVisibles | undefined {
  return TABLE[id as CleDeRegle];
}

// ---- implémentation ----

const SEANCES: OptionsVisibles = {
  "Séance de chimiothérapie": "p1_m0_seance_chimiotherapie",
  "Séance de radiothérapie": "p1_m0_seance_radiotherapie",
  "Séance de dialyse en centre, notamment d’hémodialyse":
    "p1_m0_seance_dialyse_centre",
};

const TABLE: Partial<Record<CleDeRegle, OptionsVisibles>> = {
  p2_raison_principale: SEANCES,
  p2_motif_detail: SEANCES,
  p2_transfert_motif_detail: SEANCES,
};
