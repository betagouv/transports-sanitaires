// Les CERFA que le simulateur sait pré-remplir, par le cas final qui les ouvre.
//
// Le modèle nomme un document à remettre au patient dans cinq cas
// (`cible_document_a_remettre_au_patient`) ; trois sont des CERFA que nous
// produisons. Une convocation d'audience vaut prescription à elle seule, et le
// transport à la charge de l'établissement relève d'un formulaire interne :
// rien à générer dans un cas comme dans l'autre.

import { DAP } from "./dap/document";
import type { DocumentCerfa } from "./document";
import { PMT } from "./pmt/document";
import { S3141 } from "./s3141/document";

// Ordre du livrable : S3141, puis DAP, puis PMT — les trois cas s'excluent, et
// l'ordre ne décide de rien à l'exécution (spec 0009, décision 2).
const DOCUMENTS: readonly DocumentCerfa[] = [S3141, DAP, PMT];

/** Le formulaire qu'ouvre ce cas final, s'il en ouvre un. */
export function documentPour(casFinal: string): DocumentCerfa | undefined {
  return DOCUMENTS.find((document) => document.casFinal === casFinal);
}
