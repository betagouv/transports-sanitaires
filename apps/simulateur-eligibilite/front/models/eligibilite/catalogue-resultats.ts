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
