// La pagination du parcours : une question par page, sauf les adresses.
//
// `@publicodes/forms` pagine avec `groupByNamespace`, qui regroupe les règles
// partageant le premier segment d'un nom pointé. Le modèle est plat
// (`p2_depart_adresse`, et non `départ . adresse`) : chaque question fait donc sa
// propre page. C'est le flux voulu — une question, un écran — partout sauf pour
// les douze saisies d'adresse : une adresse est **une** information, et le
// livrable la veut d'un seul tenant. Un lieu par page, le départ puis l'arrivée.

import type { FormPages } from "@publicodes/forms";
import { groupByNamespace } from "@publicodes/forms";
import type { CleDeRegle } from "../contrat-regles-publicodes";

/**
 * Les douze saisies d'adresse (D1-D12), par lieu et dans l'ordre du formulaire
 * papier. C'est l'ordre dans lequel chaque page les présente.
 */
const LIEUX: ReadonlyArray<readonly CleDeRegle[]> = [
  [
    "p2_depart_nom_lieu",
    "p2_depart_adresse",
    "p2_depart_complement_adresse",
    "p2_depart_code_postal",
    "p2_depart_commune",
    "p2_depart_pays",
  ],
  [
    "p2_arrivee_nom_lieu",
    "p2_arrivee_adresse",
    "p2_arrivee_complement_adresse",
    "p2_arrivee_code_postal",
    "p2_arrivee_commune",
    "p2_arrivee_pays",
  ],
];

export function pagesDuParcours(champs: string[]): FormPages<string> {
  return adressesParLieu(groupByNamespace(champs));
}

// ---- implémentation ----

// Les saisies d'adresse quittent leurs pages pour en former une par lieu, placées
// **en dernier**. Le reste du parcours garde la pagination de la bibliothèque.
//
// Le rang compte : la bibliothèque ne fige une page qu'une fois atteinte, et
// recalcule les suivantes à chaque réponse. Une adresse rendue applicable plus
// tôt que ses voisines (le nom du lieu, dès que le départ n'est pas le domicile)
// attendrait donc en queue qu'elles la rejoignent — au lieu de partir devant,
// seule sur un écran.
function adressesParLieu(pages: FormPages<string>): FormPages<string> {
  const lieux = LIEUX.map((lieu) =>
    lieu.filter((cle) => pages.some((page) => page.elements.includes(cle))),
  ).filter((lieu) => lieu.length > 0);
  if (lieux.length === 0) return pages;

  const saisies: string[] = lieux.flat();
  const autres = pages
    .map((page) => ({
      ...page,
      elements: page.elements.filter((champ) => !saisies.includes(champ)),
    }))
    .filter((page) => page.elements.length > 0);
  return [...autres, ...lieux.map((elements) => ({ elements }))];
}
