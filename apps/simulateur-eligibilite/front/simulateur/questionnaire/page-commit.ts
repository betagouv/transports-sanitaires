// Enregistre les réponses d'une page validée.
//
// Les réponses de la page sont remplacées. Celles qui dépendaient d'une réponse
// changée sont effacées, et elles seules.

import type { Answer, Answers, Page } from "./question";

/**
 * Les réponses du questionnaire, la page validée. `inputs` porte les réponses de
 * la page telles qu'elles sont à l'écran : une question de la page qui n'y
 * figure pas perd sa réponse.
 */
export function commitPage(
  pages: readonly Page[],
  answers: Answers,
  page: Page,
  inputs: Answers,
): Answers {
  const onThePage = new Set(page.questions.map((question) => question.id));
  const changed = [...onThePage].filter(
    (id) => !sameAnswer(answers[id], inputs[id]),
  );
  const stale = dependentsOf(pages, changed);
  const kept = Object.entries(answers).filter(
    ([id]) => !onThePage.has(id) && !stale.has(id),
  );
  return { ...Object.fromEntries(kept), ...inputs };
}

// ---- implémentation ----

// Fermeture transitive : si B dépend de A et C de B, changer A efface B et C.
function dependentsOf(
  pages: readonly Page[],
  changed: readonly string[],
): Set<string> {
  const questions = pages.flatMap((page) => page.questions);
  const stale = new Set<string>();
  let frontier = changed;
  while (frontier.length > 0) {
    const next = questions
      .filter((question) => !stale.has(question.id))
      .filter((question) =>
        question.dependsOn?.some((id) => frontier.includes(id)),
      )
      .map((question) => question.id);
    for (const id of next) stale.add(id);
    frontier = next;
  }
  return stale;
}

function sameAnswer(a: Answer | undefined, b: Answer | undefined): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
