// Le formulaire du questionnaire : le stepper, les champs de la page et les
// boutons de navigation. L'état est dans `questionnaire.ts`.

import type { ComponentType } from "react";
import { QuestionField } from "./QuestionField";
import {
  type Answers,
  type AnyCibles,
  errorOf,
  pagesOf,
  type QuestionnairePart,
} from "./question";
import type { Questionnaire, QuestionnaireOptions } from "./questionnaire";
import { useQuestionnaire } from "./questionnaire";
import { Stepper } from "./Stepper";

type Props = Omit<QuestionnaireOptions, "pages"> & {
  // Les parties de ce questionnaire, dans l'ordre.
  parts: readonly QuestionnairePart[];
  // Le nombre de parties déjà passées avant ce questionnaire.
  partsBefore?: number;
  // Nombre de parties que le stepper annonce, tous questionnaires confondus. Il
  // compte des parties, pas des pages : une question de plus ne le décale pas.
  partCount: number;
  // Libellé du bouton de la dernière page.
  endLabel: string;
  // La trace de debug, un developer tool. Le questionnaire sait où l'afficher
  // et quoi lui donner, pas à qui elle s'ouvre. Absente, rien n'est rendu.
  DebugTrace?: ComponentType<DebugTraceProps>;
};

/** Ce qu'un écran du simulateur donne à lire à la trace de debug. */
export type DebugTraceProps = {
  title: string;
  /** Les pages posées, dans l'ordre. */
  pages: ReadonlyArray<{ id: string }>;
  /** La page ouverte, s'il y en a une. */
  currentPage?: string;
  /** Le brouillon de la page ouverte. */
  draft?: Answers;
  answers: Answers;
  /** Ce que la préconisation a calculé, sur un résultat. */
  faits?: Readonly<Record<string, unknown>>;
  cibles?: AnyCibles;
};

export function QuestionnaireForm({
  parts,
  partsBefore = 0,
  partCount,
  endLabel,
  DebugTrace,
  ...options
}: Props) {
  const questionnaire = useQuestionnaire({ ...options, pages: pagesOf(parts) });
  const part = parts.findIndex((p) => p.pages.includes(questionnaire.page));

  return (
    <>
      <h1 className="fr-h3">{parts[part]?.title}</h1>
      <Stepper part={partsBefore + part + 1} total={partCount} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          questionnaire.next();
        }}
      >
        <QuestionFields questionnaire={questionnaire} />
        <NavigationButtons questionnaire={questionnaire} endLabel={endLabel} />
      </form>
      {DebugTrace && (
        <DebugTrace
          title="chemin parcouru"
          pages={questionnaire.pages}
          currentPage={questionnaire.page.id}
          draft={questionnaire.draft}
          answers={questionnaire.answers}
        />
      )}
    </>
  );
}

// ---- implémentation ----

// La page affiche son brouillon : une saisie ne compte qu'une fois la page
// validée. La première question sans réponse prend le focus, pour le clavier.
function QuestionFields({ questionnaire }: { questionnaire: Questionnaire }) {
  const toFocus = questionnaire.questions.find(
    (question) => questionnaire.draft[question.id] === undefined,
  );
  return questionnaire.questions.map((question) => (
    <QuestionField
      key={question.id}
      question={question}
      answer={questionnaire.draft[question.id]}
      error={errorOf(question, questionnaire.draft[question.id])}
      autoFocus={question === toFocus}
      onChange={(answer) => questionnaire.answer(question.id, answer)}
    />
  ));
}

function NavigationButtons({
  questionnaire,
  endLabel,
}: {
  questionnaire: Questionnaire;
  endLabel: string;
}) {
  return (
    <div
      className="fr-btns-group fr-btns-group--inline"
      style={{ marginTop: "2rem" }}
    >
      {questionnaire.hasPrevious && (
        <button
          type="button"
          className="fr-btn fr-btn--secondary"
          onClick={questionnaire.back}
        >
          Précédent
        </button>
      )}
      {/* Une page à choix unique avance d'elle-même : lui donner un bouton de
          validation contredirait le geste qu'on attend de l'utilisateur. */}
      {!questionnaire.autoAdvances && (
        <button
          type="submit"
          className="fr-btn"
          disabled={questionnaire.hasPendingQuestions}
        >
          {questionnaire.isLast ? endLabel : "Suivant"}
        </button>
      )}
    </div>
  );
}
