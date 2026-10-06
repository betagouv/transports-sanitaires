// Ce que deviennent les réponses quand une page est validée : les siennes sont
// remplacées, et celles qui dépendaient d'une réponse changée sont effacées.
//
// Seules les réponses dépendantes partent. Une réponse sans lien avec ce qui a
// changé reste, même donnée plus loin dans le parcours.

import type { Page, Reponse, Reponses } from "./question";

/**
 * Les réponses du parcours, la page validée. `saisies` porte les réponses de
 * la page telles qu'elles sont à l'écran : une question de la page qui n'y
 * figure pas perd sa réponse.
 */
export function avecPageValidee(
  pages: readonly Page[],
  reponses: Reponses,
  page: Page,
  saisies: Reponses,
): Reponses {
  const deLaPage = new Set(page.questions.map((question) => question.id));
  const changees = [...deLaPage].filter(
    (id) => !memeReponse(reponses[id], saisies[id]),
  );
  const perimees = dependantesDe(pages, changees);
  const gardees = Object.entries(reponses).filter(
    ([id]) => !deLaPage.has(id) && !perimees.has(id),
  );
  return { ...Object.fromEntries(gardees), ...saisies };
}

// ---- implémentation ----

// Fermeture transitive : si B dépend de A et C de B, changer A efface B et C.
function dependantesDe(
  pages: readonly Page[],
  changees: readonly string[],
): Set<string> {
  const questions = pages.flatMap((page) => page.questions);
  const perimees = new Set<string>();
  let front = changees;
  while (front.length > 0) {
    const suivantes = questions
      .filter((question) => !perimees.has(question.id))
      .filter((question) => question.dependDe?.some((id) => front.includes(id)))
      .map((question) => question.id);
    for (const id of suivantes) perimees.add(id);
    front = suivantes;
  }
  return perimees;
}

function memeReponse(a: Reponse | undefined, b: Reponse | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
