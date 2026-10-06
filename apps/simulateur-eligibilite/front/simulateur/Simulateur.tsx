// Le simulateur : un questionnaire, son résultat, puis le complément posé une
// fois le résultat verrouillé.
//
// Tant que le résultat n'est pas verrouillé, « Précédent » rouvre le
// questionnaire sur sa dernière page, réponses intactes. C'est l'action
// principale du résultat qui verrouille : le complément est un second parcours,
// qui reçoit les réponses acquises sans en reposer aucune, et dont la première
// page n'a pas de « Précédent ». Le verrou tient à ce montage, pas à un drapeau.

import { type ComponentType, type ReactNode, useState } from "react";
import {
  decide,
  PAGES_AFTER_LOCK,
  PAGES_BEFORE_LOCK,
  PART_COUNT,
} from "./fake-flow";
import { FlowForm, type FlowTraceProps } from "./questionnaire/FlowForm";
import type { FlowState } from "./questionnaire/flow";
import { stateAfterAnswers } from "./questionnaire/flow";
import type { Answers } from "./questionnaire/question";

type Props = {
  onNewSimulation: () => void;
  // Seed : pré-remplit le questionnaire. Complète, elle ouvre le résultat ;
  // sinon, la première page qu'elle laisse sans réponse.
  seedAnswers?: Answers | null;
  // Encadré des developer tools, rendu tel quel sous le questionnaire. Le
  // simulateur sait *où* il s'affiche, pas ce qu'il contient : c'est `App` qui le
  // compose, et il est absent hors du service produit.
  developerToolsPanel?: ReactNode;
  // Traces de debug, rendues sous le questionnaire et sous les résultats. Même
  // garde que le panneau ci-dessus. Ce sont des composants et non du contenu
  // composé : le simulateur leur donne l'état vivant du parcours, qu'`App` n'a
  // pas sous la main.
  debugTraces?: DebugTraces;
};

/** Ce qu'une page de résultat donne à lire à sa trace de debug. */
export type ResultTraceProps = {
  title: string;
  answers: Readonly<Record<string, unknown>>;
  outputs: Readonly<Record<string, unknown>>;
};

type DebugTraces = {
  Flow: ComponentType<FlowTraceProps>;
  Result: ComponentType<ResultTraceProps>;
};

export function Simulateur({
  onNewSimulation,
  seedAnswers = null,
  developerToolsPanel,
  debugTraces,
}: Props) {
  const [screen, goTo] = useState<Screen>(() => startingScreen(seedAnswers));
  const commun = { goTo, debugTraces, onRestart: onNewSimulation };

  switch (screen.name) {
    case "questionnaire":
      return (
        <>
          <Questionnaire screen={screen} {...commun} />
          {developerToolsPanel}
        </>
      );
    case "result":
      return <ResultToLock screen={screen} {...commun} />;
    case "complement":
      return <Complement screen={screen} {...commun} />;
    default:
      return <CompletedOrder screen={screen} {...commun} />;
  }
}

// ---- implémentation ----

// `previousFlow` est le parcours qu'un résultat a derrière lui : c'est lui que
// « Précédent » rouvre. Passé le verrou, l'état du questionnaire n'est plus
// porté par aucun écran : il n'y a plus rien à rouvrir.
type Screen =
  | { name: "questionnaire"; resume?: FlowState }
  | { name: "result"; previousFlow: FlowState }
  | { name: "complement"; locked: Answers; resume?: FlowState }
  | { name: "end"; locked: Answers; previousFlow: FlowState };

type ScreenProps<Name extends Screen["name"]> = {
  screen: Extract<Screen, { name: Name }>;
  goTo: (screen: Screen) => void;
  debugTraces?: DebugTraces;
  onRestart: () => void;
};

// Une seed n'est qu'un pré-remplissage : à réponses égales, l'application se
// comporte comme sous les doigts d'un utilisateur, « Précédent » compris.
function startingScreen(seedAnswers: Answers | null): Screen {
  if (!seedAnswers) return { name: "questionnaire" };
  const { complete, ...state } = stateAfterAnswers(
    PAGES_BEFORE_LOCK,
    seedAnswers,
  );
  return complete
    ? { name: "result", previousFlow: state }
    : { name: "questionnaire", resume: state };
}

function Questionnaire({
  screen,
  goTo,
  debugTraces,
}: ScreenProps<"questionnaire">) {
  return (
    <>
      <h1 className="fr-h3">Parcours factice</h1>
      <div className="fr-alert fr-alert--info fr-alert--sm fr-mb-4w">
        <p>
          Ce parcours ne décide rien. Il éprouve la navigation, le temps que le
          modèle d’éligibilité suivant soit intégré.
        </p>
      </div>
      <FlowForm
        pages={PAGES_BEFORE_LOCK}
        partCount={PART_COUNT}
        initialState={screen.resume}
        tracked
        endLabel="Voir le résultat"
        Trace={debugTraces?.Flow}
        onComplete={(_, previousFlow) => goTo({ name: "result", previousFlow })}
      />
    </>
  );
}

// Le verrou ne s'annonce pas à l'écran : l'interface nomme l'action, et le
// « Précédent » de cette page dit ce qui reste ouvert.
function ResultToLock({
  screen,
  goTo,
  debugTraces,
  onRestart,
}: ScreenProps<"result">) {
  const { answers } = screen.previousFlow;
  const outputs = decide(answers);
  const reopen = () =>
    goTo({ name: "questionnaire", resume: screen.previousFlow });
  const lock = () => goTo({ name: "complement", locked: answers });
  return (
    <>
      <h1 className="fr-h3">Résultat</h1>
      <p className="fr-text--lead">Commande : {outputs.commande}</p>
      <div className="fr-btns-group fr-btns-group--inline">
        <SecondaryButton onClick={reopen}>Précédent</SecondaryButton>
        <button type="button" className="fr-btn" onClick={lock}>
          Compléter la commande
        </button>
        <SecondaryButton onClick={onRestart}>
          Nouvelle simulation
        </SecondaryButton>
      </div>
      {debugTraces && (
        <debugTraces.Result
          title="résultat"
          answers={answers}
          outputs={outputs}
        />
      )}
    </>
  );
}

// Le complément n'émet pas d'évènement : ce qu'on y mesurera se décidera avec
// les documents du modèle suivant.
function Complement({ screen, goTo, debugTraces }: ScreenProps<"complement">) {
  const { locked } = screen;
  return (
    <>
      <h1 className="fr-h3">Compléter la commande</h1>
      <FlowForm
        pages={PAGES_AFTER_LOCK}
        partCount={PART_COUNT}
        lockedAnswers={locked}
        initialState={screen.resume}
        tracked={false}
        endLabel="Terminer"
        Trace={debugTraces?.Flow}
        onComplete={(_, previousFlow) =>
          goTo({ name: "end", locked, previousFlow })
        }
      />
    </>
  );
}

// « Précédent » revient au complément, jamais en deçà du verrou.
function CompletedOrder({
  screen,
  goTo,
  debugTraces,
  onRestart,
}: ScreenProps<"end">) {
  const { answers } = screen.previousFlow;
  const outputs = decide(answers);
  const reopen = () =>
    goTo({
      name: "complement",
      locked: screen.locked,
      resume: screen.previousFlow,
    });
  return (
    <>
      <h1 className="fr-h3">Commande complétée</h1>
      <p className="fr-text--lead">
        Commande : {outputs.commande}, {String(answers.quantite)} tasses
      </p>
      <div className="fr-btns-group fr-btns-group--inline">
        <SecondaryButton onClick={reopen}>Précédent</SecondaryButton>
        <button type="button" className="fr-btn" onClick={onRestart}>
          Nouvelle simulation
        </button>
      </div>
      {debugTraces && (
        <debugTraces.Result
          title="commande complétée"
          answers={answers}
          outputs={outputs}
        />
      )}
    </>
  );
}

function SecondaryButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="fr-btn fr-btn--secondary"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
