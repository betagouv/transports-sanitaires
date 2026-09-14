// Le constructeur de formulaire du parcours : ce qui engendre le questionnaire
// à partir des règles, et le découpe en pages.
//
// Il est partagé — la passation s'en sert pour la saisie, le rejeu d'une seed
// pour reconstituer un parcours. Deux constructeurs, ce seraient deux
// questionnaires : mêmes règles, mais pas les mêmes pages.

import { FormBuilder } from "@publicodes/forms";
import { moteur } from "../moteur";
import { pagesDuParcours } from "./pagination";

/**
 * `pageBuilder` : la pagination naturelle de la bibliothèque, à une exception
 * près — les douze saisies d'adresse tiennent sur une page (cf. `pagination.ts`).
 * `selectTreshold` (sic, orthographe de la lib) : une question à N possibilités
 * est rendue en boutons radio jusqu'à ce seuil (défaut 5), en liste déroulante
 * au-delà. Un choix unique reste un choix unique quel que soit son nombre de
 * réponses : `Number.POSITIVE_INFINITY` retire le seuil plutôt que de le
 * relever, une valeur finie retombant tôt ou tard sur une liste déroulante.
 */
export const formBuilder = new FormBuilder({
  engine: moteur,
  pageBuilder: pagesDuParcours,
  selectTreshold: Number.POSITIVE_INFINITY,
});
