// Le parcours qu'aurait laissé derrière lui un utilisateur ayant donné ces
// réponses.
//
// Une situation déjà remplie ne fait pas un parcours : le moteur ne pose pas les
// questions dont il détient la réponse, et un questionnaire ouvert dessus se
// refermerait aussitôt. C'est ce qui distinguait une seed d'une saisie — sa page
// de résultat n'avait rien derrière elle, donc pas de « Précédent ». Or une seed
// n'est qu'un pré-remplissage : à réponses égales, l'application doit se
// comporter comme sous les doigts d'un utilisateur.
//
// On rejoue donc le questionnaire page par page, en ne versant à chaque page que
// les réponses qui la concernent : le séquencement conditionnel du modèle se
// déroule alors dans le même ordre, et l'état obtenu est celui d'un parcours
// mené à son terme — pages traversées, dernière page ouverte.

import {
  computeNextFields,
  FormBuilder,
  type FormState,
} from "@publicodes/forms";
import type { Situation } from "publicodes";
import { moteur } from "../moteur";
import { formBuilder } from "./constructeur-de-formulaire";
import { pagesDuParcours } from "./pagination";

type Options = {
  // Règles cibles du parcours rejoué : elles décident des questions posées.
  cibles: readonly string[];
  // Les réponses à verser, déjà exprimées en publicodes (celles d'une seed).
  reponses: Situation<string>;
  // Réponses acquises avant ce parcours — la Partie 1 pour le secrétariat.
  // Elles ne sont pas reposées, donc pas traversées.
  situationInitiale?: Situation<string>;
};

export function rejouerLesReponses({
  cibles,
  reponses,
  situationInitiale,
}: Options): FormState<string> {
  let etat = formBuilder.start(
    FormBuilder.newState(situationInitiale),
    ...cibles,
  );
  for (let i = 0; i < LIMITE_DE_PAGES; i++) {
    etat = avecLesReponsesDeLaPage(etat, reponses);
    if (!formBuilder.pagination(etat).hasNextPage) return etat;
    etat = formBuilder.goToNextPage(etat);
  }
  return etat;
}

// ---- implémentation ----

// Verser les réponses de la page courante, puis recalculer la suite du parcours.
// Ce second geste est indispensable : `goToNextPage` se contente de dépiler les
// pages déjà connues, et seule une saisie (`handleInputChange`) les recalcule.
// Nous n'en passons pas par elle — elle convertit une valeur de formulaire,
// quand nous écrivons des valeurs déjà exprimées en publicodes —, donc nous
// reproduisons ce qu'elle fait de plus : réamorcer le moteur, et redemander au
// modèle ce qu'il reste à poser.
function avecLesReponsesDeLaPage(
  etat: FormState<string>,
  reponses: Situation<string>,
): FormState<string> {
  const situation = { ...etat.situation };
  for (const champ of formBuilder.currentPage(etat).elements) {
    const reponse = reponses[champ.id];
    if (reponse !== undefined) situation[champ.id] = reponse;
  }
  moteur.setSituation(situation);
  const repondu = { ...etat, situation };
  return {
    ...repondu,
    nextPages: pagesDuParcours(computeNextFields(moteur, repondu)),
  };
}

// Garde-fou : le rejeu s'arrête de lui-même quand le modèle n'a plus rien à
// poser (une question paginée ne revient jamais, cf. `computeNextFields`). Cette
// borne n'existe que pour qu'une situation aberrante ne fasse pas tourner la
// boucle indéfiniment — elle est très au-dessus du nombre de pages du modèle.
const LIMITE_DE_PAGES = 100;
