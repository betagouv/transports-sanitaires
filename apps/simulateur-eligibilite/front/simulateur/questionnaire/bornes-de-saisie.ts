// Les bornes d'une saisie numérique, telles que le modèle les déclare.
//
// Le moteur n'interprète pas la clé `saisie` : elle reste dans les règles brutes,
// comme la clé `mosaique` (cf. `mosaique.ts`), et `@publicodes/forms` n'en expose
// rien sur le champ évalué. C'est donc à l'interface d'aller la lire — faute de
// quoi elle inventerait ses propres bornes, et le formulaire accepterait à la
// saisie ce que le modèle refuse ensuite.

import { reglesBrutes } from "../moteur";

export type Bornes = {
  /** Plus petite valeur acceptée. */
  min?: number;
  /** Écart entre deux valeurs acceptées ; `1` pour un entier. */
  pas?: number;
};

/**
 * Les bornes que la règle déclare. Vides quand elle n'en déclare pas : le modèle
 * ne contraint alors rien, et l'interface s'en garde autant.
 */
export function bornesDeSaisie(id: string): Bornes {
  const saisie = corps(id)?.saisie;
  if (!saisie) return {};
  return {
    min: saisie.minimum,
    // Un entier avance de 1 en 1 — c'est ce que dit `entier` quand le modèle ne
    // nomme pas de pas. `valeur_par_defaut` n'a pas à être lue ici : le moteur
    // s'en charge, et le champ la porte déjà dans `defaultValue`.
    pas: saisie.pas ?? (saisie.entier ? 1 : undefined),
  };
}

// ---- implémentation ----

type CorpsRegle = {
  saisie?: {
    minimum?: number;
    pas?: number;
    entier?: boolean;
  };
};

function corps(id: string): CorpsRegle | undefined {
  const c = reglesBrutes[id as keyof typeof reglesBrutes];
  return c && typeof c === "object" ? (c as CorpsRegle) : undefined;
}
