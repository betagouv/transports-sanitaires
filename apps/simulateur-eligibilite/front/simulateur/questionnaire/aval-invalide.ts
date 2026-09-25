// TS973-16 : toute modification réelle d'une réponse invalide les réponses
// des étapes suivantes, qui se reposent. C'est la règle du contrat
// d'interface (`state.on_change:
// clear_all_downstream_question_values_then_recompute_technical_values`) et
// du guide de l'éditeur : « Après modification effective, effacer les
// réponses dépendantes en aval puis recalculer. Un simple retour visuel sans
// modification conserve les données. »
//
// Sans cela, une réponse donnée pour une autre branche du parcours resterait
// dans la situation. Exemple : une exception cochée pour un transfert
// provisoire, après le passage à « Définitif ». Le modèle l'ignore, mais la
// garde des déclarations la lit dans la situation brute et bloquerait le
// résultat.
//
// Effacer ne suffit pas : `@publicodes/forms` ne repose jamais une page déjà
// visitée. L'historique est donc tronqué à la page modifiée, sur le principe
// de `convocation-revalidation.ts`.

import type { FormState } from "@publicodes/forms";
import { formBuilder } from "./constructeur-de-formulaire";
import { champsEnAval } from "./etapes";

/** Une réponse et la valeur qu'elle avait avant la saisie. */
export type Changement = readonly [id: string, précédente: unknown];

/**
 * Efface les réponses en aval d'une réponse qui change réellement de valeur :
 * pas à la première réponse, ni à une réponse identique. Les valeurs d'avant
 * sont lues par l'appelant, avant `handleInputChange`, qui mute l'état.
 */
export function avecAvalInvalide(
  changements: readonly Changement[],
  etatApres: FormState<string>,
): FormState<string> {
  const change = changements.find(
    ([id, précédente]) =>
      précédente !== undefined && précédente !== etatApres.situation[id],
  );
  if (!change) return etatApres;
  const [id] = change;
  const repondus = champsEnAval(id).filter(
    (champ) => etatApres.situation[champ] !== undefined,
  );
  if (repondus.length === 0) return etatApres;
  const efface = repondus.reduce(
    (etat, champ) => formBuilder.handleInputChange(etat, champ, undefined),
    etatApres,
  );
  return avecPagesTronquees(efface, id);
}

// ---- implémentation ----

// La page modifiée devient la dernière de l'historique : les suivantes se
// recalculent comme neuves.
function avecPagesTronquees(
  etat: FormState<string>,
  id: string,
): FormState<string> {
  const index = etat.pages.findIndex((page) => page.elements.includes(id));
  if (index === -1) return etat;
  return {
    ...etat,
    pages: etat.pages.slice(0, index + 1),
    currentPageIndex: index,
  };
}
