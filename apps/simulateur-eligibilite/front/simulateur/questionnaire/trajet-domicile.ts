// La seule combinaison de lieux qu'un trajet ne peut jamais faire : deux
// domiciles (`p2_types_lieux_valides`, `../entrees-calculees.ts`). Le modèle ne
// sait pas exclure une option d'une autre — les possibilités qu'il déclare sont
// des chaînes littérales, jamais des règles qu'on pourrait rendre non
// applicables —, donc cette règle vit ici, côté application : retirer l'option
// à l'affichage (cf. `ChampsDePage.tsx`) et effacer une arrivée Domicile déjà
// choisie quand le départ le devient à son tour (cf. `passation.ts`).

import type { FormState } from "@publicodes/forms";
import { moteur, texte } from "../moteur";
import { formBuilder } from "./constructeur-de-formulaire";

/**
 * Un départ posé en Domicile rend invalide une arrivée Domicile déjà choisie.
 * Sans ce nettoyage, l'option disparaît de l'écran d'arrivée mais la réponse
 * reste en mémoire, et le trajet resterait bloqué sur un choix qu'on ne peut
 * plus ni voir ni changer.
 */
export function avecArriveeDomicileEffacee(
  id: string,
  valeur: unknown,
  etat: FormState<string>,
): FormState<string> {
  if (id !== "p2_trajet_depart" || valeur !== "Domicile") return etat;
  if (
    texte(moteur.setSituation(etat.situation), "p2_trajet_arrivee") !==
    "Domicile"
  )
    return etat;
  return formBuilder.handleInputChange(etat, "p2_trajet_arrivee", undefined);
}
