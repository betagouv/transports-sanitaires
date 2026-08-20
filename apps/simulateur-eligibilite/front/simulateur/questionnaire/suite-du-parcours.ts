// Ce qui reste au programme du parcours, une page quittée.
//
// Le questionnaire se déduit de ce qui *manque* au moteur pour trancher ses
// cibles (`computeNextFields`). Tant qu'on avance, cela suffit. Mais on peut
// revenir en arrière : revenir ne retire aucune réponse, et une réponse donnée
// ne manque plus — les pages en aval se videraient donc du parcours à la
// première correction. Elles restent au contraire dans `pages`, et c'est ici
// qu'on retire, une page quittée, celles que la correction a rendues sans objet.

import type { FormState } from "@publicodes/forms";
import { formBuilder } from "./constructeur-de-formulaire";

/**
 * La suite du parcours, revue au moment de quitter une page. Sans objet tant
 * qu'on avance : il n'y a alors rien en aval de la page courante.
 *
 * Après un retour en arrière, si : une réponse changée peut fermer une branche,
 * et les pages déjà traversées qu'elle rend sans objet doivent disparaître.
 * Celles qu'elle révèle, elles, sont déjà dans `nextPages` —
 * `handleInputChange` les y met, en excluant ce que `pages` contient déjà.
 *
 * **Au départ de la page, et pas à chaque saisie** : une réponse en cours de
 * correction laisse le modèle sans réponse à une question qu'il pose, et tout ce
 * qui en dépend devient indécidable — il n'évalue pas au-delà de sa première
 * condition non satisfaite. Le temps d'effacer un code postal, la question qui
 * suit passerait pour caduque, et on l'aurait supprimée. On ne juge donc la
 * suite qu'une page répondue.
 */
export function avecSuiteRevue(
  formState: FormState<string>,
): FormState<string> {
  const debutDeLAval = formState.currentPageIndex + 1;
  const traversees = formState.pages.slice(0, debutDeLAval);
  const aVenir = formState.pages
    .slice(debutDeLAval)
    .filter((_, rang) => estEncorePosee(formState, debutDeLAval + rang));
  if (aVenir.length === formState.pages.length - debutDeLAval) return formState;
  return { ...formState, pages: [...traversees, ...aVenir] };
}

// ---- implémentation ----

// Une page est encore posée tant qu'une de ses questions sert à déterminer les
// cibles. La bibliothèque le calcule pour la page courante : on lui présente
// donc la page à examiner comme si elle l'était.
function estEncorePosee(formState: FormState<string>, index: number): boolean {
  const page = formBuilder.currentPage({
    ...formState,
    currentPageIndex: index,
  });
  return page.elements.some((champ) => champ.useful);
}
