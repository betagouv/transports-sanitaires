// Les CERFA que le simulateur sait pré-remplir, par le cas final qui les ouvre.
//
// Le modèle nomme un document à remettre au patient dans quatre cas
// (`cible_document_a_remettre_au_patient`) ; deux seulement sont des CERFA que
// nous produisons. Une convocation d'audience vaut prescription à elle seule, et
// le transport à la charge de l'établissement relève d'un formulaire interne :
// rien à générer dans un cas comme dans l'autre.

import { DAP } from "./dap/document";
import type { DocumentCerfa } from "./document";
import { PMT } from "./pmt/document";

const DOCUMENTS: readonly DocumentCerfa[] = [PMT, DAP];

/** Le formulaire qu'ouvre ce cas final, s'il en ouvre un. */
export function documentPour(casFinal: string): DocumentCerfa | undefined {
  return DOCUMENTS.find((document) => document.casFinal === casFinal);
}
