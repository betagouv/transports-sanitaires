// Ce que les tests d'une capacité du questionnaire partagent : poser des pages
// écrites dans le test, sans passer par l'application ni par un modèle.

import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuestionnaireForm } from "../../../front/socle/questionnaire-engine/QuestionnaireForm";
import type {
  Answers,
  Page,
} from "../../../front/socle/questionnaire-engine/question";

/** Pose ces pages. `reponses` rend ce que le questionnaire a validé, une fois fini. */
export function poser(pages: readonly Page[]) {
  let validees: Answers | undefined;
  render(
    <QuestionnaireForm
      parts={[{ id: "partie", title: "Partie", pages }]}
      partCount={1}
      endLabel="Terminer"
      tracked={false}
      onComplete={(answers) => {
        validees = answers;
      }}
    />,
  );
  return { user: userEvent.setup(), reponses: () => validees };
}
