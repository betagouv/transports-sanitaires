// La pagination du parcours : une question par page, sauf les adresses.
//
// `@publicodes/forms` pagine avec `groupByNamespace`, qui regroupe les règles
// partageant le premier segment d'un nom pointé. Le modèle est plat
// (`p2_depart_adresse`, et non `départ . adresse`) : chaque question fait donc sa
// propre page. C'est le flux voulu — une question, un écran — partout sauf pour
// les douze saisies d'adresse, qui composent **une seule** information et que le
// livrable demande de présenter les unes sous les autres.

import type { FormPages } from "@publicodes/forms";
import { groupByNamespace } from "@publicodes/forms";
import type { CleDeRegle } from "../contrat-regles-publicodes";

/**
 * Les douze saisies d'adresse (D1-D12), dans l'ordre du formulaire papier :
 * le lieu de départ en entier, puis le lieu d'arrivée. C'est l'ordre dans lequel
 * la page les présente.
 */
const ADRESSES: readonly CleDeRegle[] = [
  "p2_depart_nom_lieu",
  "p2_depart_adresse",
  "p2_depart_complement_adresse",
  "p2_depart_code_postal",
  "p2_depart_commune",
  "p2_depart_pays",
  "p2_arrivee_nom_lieu",
  "p2_arrivee_adresse",
  "p2_arrivee_complement_adresse",
  "p2_arrivee_code_postal",
  "p2_arrivee_commune",
  "p2_arrivee_pays",
];

export function pagesDuParcours(champs: string[]): FormPages<string> {
  return adressesSurUnePage(groupByNamespace(champs));
}

// ---- implémentation ----

// Les saisies d'adresse quittent leurs pages pour n'en former qu'une, placée
// **en dernier**. Le reste du parcours garde la pagination de la bibliothèque.
//
// Le rang compte : la bibliothèque ne fige une page qu'une fois atteinte, et
// recalcule les suivantes à chaque réponse. Une adresse rendue applicable plus
// tôt que ses voisines (le nom du lieu, dès que le départ n'est pas le domicile)
// attendrait donc sur la dernière page qu'elles la rejoignent — au lieu de partir
// devant, seule sur un écran.
function adressesSurUnePage(pages: FormPages<string>): FormPages<string> {
  const saisies: string[] = ADRESSES.filter((cle) =>
    pages.some((page) => page.elements.includes(cle)),
  );
  if (saisies.length === 0) return pages;

  const autres = pages
    .map((page) => ({
      ...page,
      elements: page.elements.filter((champ) => !saisies.includes(champ)),
    }))
    .filter((page) => page.elements.length > 0);
  return [...autres, { elements: saisies }];
}
