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
 * au-delà. Relevé à 10 pour garder le radio sur les listes un peu longues.
 */
export const formBuilder = new FormBuilder({
  engine: moteur,
  pageBuilder: pagesDuParcours,
  selectTreshold: 10,
});
