// Le vocabulaire des scénarios v9.2.1 : les réponses qu'on cite constamment, et la
// façon d'amorcer un moteur dessus. Partagé par les deux fichiers qui rejouent la
// matrice du livrable — la liste nommée et les familles engendrées.

import type { Situation } from "publicodes";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { moteurDeTest } from "./moteur";

/** Les trois réponses de Q1, mot pour mot. */
export const AUTONOME =
  "'Peut se déplacer seul, sans aide technique ou humaine et sans besoin particulier sur l’entièreté du trajet.'";
export const PROCHE =
  "'Peut se déplacer avec un proche accompagnant, qui peut l’aider à se déplacer ou à transmettre les informations nécessaires à l’équipe soignante, sans intervention d’un professionnel pendant le transport.'";
export const PRO =
  "'Nécessite une prise en charge spécifique pendant le trajet ou l’aide d’un professionnel pour se déplacer ou accomplir les formalités liées au transport.'";

/** Les deux mosaïques dont on décoche sans cesse l'option exclusive. */
export const HOSPITALISATION = {
  p2_contexte_hospitalisation: "oui",
  p2_contexte_aucun: "non",
};
export const ALD = { p1_m0_ald: "oui", p1_m0_aucun: "non" };

/** Valeurs de cibles citées par les attendus. */
export const VSL = "VSL (Véhicule Sanitaire Léger) ou taxi conventionné";
export const TPMR =
  "VSL (Véhicule Sanitaire Léger) TPMR (Transport de Personnes à Mobilité Réduite) ou taxi conventionné TPMR (Transport de Personnes à Mobilité Réduite)";
export const PMT = "prescription médicale de transport";
export const DAP = "demande d’accord préalable";
export const CHARGE_ETABLISSEMENT = "transport à la charge de l’établissement";
export const NON_ELIGIBLE =
  "non éligible à une prise en charge par l’Assurance Maladie";

/**
 * Réponses d'un scénario, surchargées sur la base neutre. `null` **retire** la
 * clé : c'est ainsi qu'un scénario laisse une question sans réponse, ce qu'aucune
 * surcharge ne saurait exprimer.
 */
export type Reponses = Record<string, string | null>;

/** Moteur amorcé sur la base neutre, surchargée par `reponses`. */
export function evalue(reponses: Reponses) {
  const situation: Situation<string> = { ...BASE_NEUTRE };
  for (const [cle, valeur] of Object.entries(reponses)) {
    if (valeur === null) delete situation[cle];
    else situation[cle] = valeur;
  }
  return moteurDeTest(situation);
}
