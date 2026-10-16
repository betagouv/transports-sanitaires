// Des traces écrites à la main pour les tests du résultat praticien : rien n'y
// est prouvé, sauf ce que le test pose. Elles donnent aux cibles et aux faits
// de la trace les seules valeurs qu'une condition des règles lit.

import {
  CIBLES,
  type Cibles,
} from "../../../front/models/eligibilite/declarations/cibles";
import {
  AUCUN_FAIT,
  type Faits,
} from "../../../front/models/eligibilite/declarations/faits";
import type { Precisions } from "../../../front/models/eligibilite/precisions-du-resultat";
import type { Trace } from "../../../front/models/eligibilite/trace-du-resultat";

// Une trace dont rien n'est prouvé, avec ce que le test pose.
const AUCUNE_CIBLE = Object.fromEntries(
  CIBLES.map((cible) => [cible, undefined]),
) as Cibles;
export const vrai = { value: true, provenance: "test" };
export const faux = { value: false, provenance: "test" };

export const trace = (
  cibles: Partial<Cibles>,
  faits: Partial<Faits> = {},
  precisions: Precisions = {},
): Trace => ({
  cibles: { ...AUCUNE_CIBLE, ...cibles },
  faits: { ...AUCUN_FAIT, ...faits },
  criteres: [],
  precisions,
});
