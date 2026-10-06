// Parcours de questions générique : le stepper, les champs de la page courante,
// et les boutons de navigation. Toute la mécanique d'état est dans
// `flow.ts`.

import { FlowTrace } from "./FlowTrace";
import { FormField } from "./FormField";
import type { Flow, Options } from "./flow";
import { useFlow } from "./flow";
import { errorOf } from "./question";

type Props = Options & {
  // Nombre de parties que le stepper annonce. Il compte des parties, jamais des
  // pages : une question de plus ne déplace pas le prescripteur dans le parcours.
  partCount: number;
  // Libellé du bouton de la dernière page.
  endLabel: string;
  // La trace de debug sous le questionnaire est un developer tool : le simulateur
  // sait *où* elle s'affiche, pas à qui elle s'ouvre. Défaut fermé : un appelant
  // qui l'oublie n'en montre pas.
  debugTrace?: boolean;
};

export function FlowForm({
  partCount,
  endLabel,
  debugTrace = false,
  ...options
}: Props) {
  const flow = useFlow(options);

  return (
    <>
      <Stepper part={flow.page.part} total={partCount} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          flow.next();
        }}
      >
        <FormFields flow={flow} />
        <NavigationButtons flow={flow} endLabel={endLabel} />
      </form>
      <FlowTrace allowed={debugTrace} flow={flow} />
    </>
  );
}

// ---- implémentation ----

// La page rend son brouillon : une saisie ne compte qu'une fois la page validée.
// La première question non répondue prend le focus, pour qu'un parcours se mène
// au clavier.
function FormFields({ flow }: { flow: Flow }) {
  const toFocus = flow.questions.find(
    (question) => flow.draft[question.id] === undefined,
  );
  return flow.questions.map((question) => (
    <FormField
      key={question.id}
      question={question}
      answer={flow.draft[question.id]}
      error={errorOf(question, flow.draft[question.id])}
      autoFocus={question === toFocus}
      onChange={(answer) => flow.answer(question.id, answer)}
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
  flow,
  endLabel,
}: {
  flow: Flow;
  endLabel: string;
}) {
  return (
    <div
      className="fr-btns-group fr-btns-group--inline"
      style={{ marginTop: "2rem" }}
    >
      {flow.hasPrevious && (
        <button
          type="button"
          className="fr-btn fr-btn--secondary"
          onClick={flow.back}
        >
          Précédent
        </button>
      )}
      {/* Une page à choix unique avance d'elle-même : lui donner un bouton de
          validation contredirait le geste qu'on attend de l'utilisateur. */}
      {!flow.autoAdvances && (
        <button
          type="submit"
          className="fr-btn"
          disabled={flow.hasPendingQuestions}
        >
          {flow.isLast ? endLabel : "Suivant"}
        </button>
      )}
    </div>
  );
}
