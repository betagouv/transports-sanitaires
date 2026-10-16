// L'exclusion du transport : une règle officielle interdit-elle la prise en
// charge de ce transport ? Aucune question ne la pose au médecin : le logiciel
// la constate dans les règles qu'il a chargées (D-105).
//
// Les règles de l'éditeur ne portent aucune règle d'exclusion du transport.
// Le fait vaut donc « non » : rien ne l'interdit. Ce n'est pas la preuve de
// l'éligibilité. Une simulation se fait en une fois, sur le modèle chargé à
// l'ouverture : le constat vaut pour toute la simulation.

import type { Fait } from "../../socle/decision-engine/publicodes";

/** Le constat du logiciel sur les règles chargées. */
export const EXCLUSION_DU_TRANSPORT: Fait = {
  value: false,
  provenance:
    "Contrôle du logiciel : les règles chargées ne portent aucune règle d'exclusion du transport.",
};
