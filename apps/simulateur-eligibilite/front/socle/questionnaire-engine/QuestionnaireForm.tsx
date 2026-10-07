// Le formulaire du questionnaire : le stepper, les champs de la page et les
// boutons de navigation. L'état est dans `questionnaire.ts`.

import type { ComponentType } from "react";
import { QuestionField } from "./QuestionField";
import { type Answers, errorOf } from "./question";
import type { Questionnaire, QuestionnaireOptions } from "./questionnaire";
import { useQuestionnaire } from "./questionnaire";

type Props = QuestionnaireOptions & {
  // Nombre de parties que le stepper annonce. Il compte des parties, pas des
  // pages : une question de plus ne décale pas le stepper.
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
  /** Ce que la décision a rendu, sur une page de résultat. */
  outputs?: Readonly<Record<string, unknown>>;
};

export function QuestionnaireForm({
  partCount,
  endLabel,
  DebugTrace,
  ...options
}: Props) {
  const questionnaire = useQuestionnaire(options);

  return (
    <>
      <Stepper part={questionnaire.page.part} total={partCount} />
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

function Stepper({ part, total }: { part: number; total: number }) {
  return (
    <div className="fr-stepper" style={{ marginBottom: "2rem" }}>
      <h2 className="fr-stepper__title">
        <span className="fr-stepper__state">
          Étape {part} sur {total}
        </span>
      </h2>
      <div
        className="fr-stepper__steps"
        data-fr-current-step={part}
        data-fr-steps={total}
      />
      {/* L'avancement automatique change d'écran sans clic : le lecteur d'écran
          doit l'annoncer, sans quoi le changement passe inaperçu. */}
      <p className="fr-sr-only" aria-live="polite">
        Étape {part} sur {total}
      </p>
    </div>
  );
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
