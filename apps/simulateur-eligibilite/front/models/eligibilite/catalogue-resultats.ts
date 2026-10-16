// Les textes de R2, que l'éditeur livre à côté de ses règles
// (`rules/catalogue-resultats.json`, D-103). Ils ne se chargent qu'à la demande :
// 900 ko de textes n'ont rien à faire sur les pages du questionnaire.

import type { CatalogueResultats } from "./declarations/catalogue-resultats";

/** Le catalogue des textes de R2. L'affectation vérifie sa forme. */
export async function catalogueResultats(): Promise<CatalogueResultats> {
  const { default: catalogue } = await import(
    "./rules/catalogue-resultats.json"
  );
  return catalogue;
}

/** Le catalogue chargé, ou l'échec du chargement : le réseau peut manquer. */
export type Chargement =
  | { readonly catalogue: CatalogueResultats }
  | { readonly echec: true };

/**
 * La même promesse à chaque appel, pour qu'un composant la lise avec `use()`
 * sans la recréer à chaque affichage. Elle ne rejette jamais ; un échec est
 * oublié, pour que l'affichage suivant retente le chargement.
 */
export function catalogueDeLaSession(): Promise<Chargement> {
  attente ??= catalogueResultats().then(
    (catalogue) => ({ catalogue }),
    () => {
      attente = undefined;
      return { echec: true } as const;
    },
  );
  return attente;
}

// ---- implémentation ----

let attente: Promise<Chargement> | undefined;
