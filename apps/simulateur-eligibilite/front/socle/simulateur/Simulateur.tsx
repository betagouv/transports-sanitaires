// Le parcours du simulateur : un questionnaire, son résultat, puis, si la
// préconisation donne un cerfa, un second questionnaire et son résultat.
//
// Depuis le premier résultat, « Précédent » rouvre le questionnaire. L'action
// principale verrouille : la préconisation est figée, et le second
// questionnaire ne repose aucune question d'avant.

import { type ComponentType, type ReactNode, useState } from "react";
import type { Model } from "../model";
import {
  type DebugTraceProps,
  QuestionnaireForm,
} from "../questionnaire-engine/QuestionnaireForm";
import type { Answers } from "../questionnaire-engine/question";
import { CerfaResultat, FirstResultat } from "./Resultats";
import { type Screen, startingScreen } from "./start";

type Props = {
  /** La version du modèle que le parcours déroule. */
  model: Model;
  onNewSimulation: () => void;
  // Seed : pré-remplit le parcours, qui s'ouvre là où ses réponses mènent.
  seedAnswers?: Answers | null;
  // L'encadré des developer tools, rendu tel quel sous le questionnaire. `App`
  // le compose. Absent hors du service produit.
  developerToolsPanel?: ReactNode;
  // La trace de debug, rendue sous le questionnaire et sous les résultats. Même
  // garde que l'encadré. C'est un composant, pas du contenu composé : le
  // simulateur lui passe l'état vivant du questionnaire, qu'`App` n'a pas.
  DebugTrace?: ComponentType<DebugTraceProps>;
};

export function Simulateur({
  model,
  onNewSimulation,
  seedAnswers = null,
  developerToolsPanel,
  DebugTrace,
}: Props) {
  const [screen, goTo] = useState<Screen>(() =>
    startingScreen(model, seedAnswers),
  );
  const common = { model, goTo, DebugTrace, onRestart: onNewSimulation };

  switch (screen.name) {
    case "questionnaire":
      return (
        <>
          <FirstQuestionnaire screen={screen} {...common} />
          {developerToolsPanel}
        </>
      );
    case "resultat":
      return <FirstResultatScreen screen={screen} {...common} />;
    case "complement":
      return <SecondQuestionnaire screen={screen} {...common} />;
    default:
      return <CerfaResultatScreen screen={screen} {...common} />;
  }
}

// ---- implémentation ----

type ScreenProps<Name extends Screen["name"]> = {
  model: Model;
  screen: Extract<Screen, { name: Name }>;
  goTo: (screen: Screen) => void;
  DebugTrace?: ComponentType<DebugTraceProps>;
  onRestart: () => void;
};

// Le stepper annonce une partie de plus que celles-ci : tant que rien n'est
// décidé, le cerfa reste possible.
function FirstQuestionnaire({
  model,
  screen,
  goTo,
  DebugTrace,
}: ScreenProps<"questionnaire">) {
  const { parts } = model.transportAndEligibility;
  return (
    <QuestionnaireForm
      parts={parts}
      partCount={parts.length + 1}
      initialState={screen.resume}
      tracked
      endLabel="Voir le résultat"
      DebugTrace={DebugTrace}
      onComplete={(_, previousState) =>
        goTo({ name: "resultat", previousState })
      }
    />
  );
}

// Le second questionnaire n'émet pas d'évènement.
function SecondQuestionnaire({
  model,
  screen,
  goTo,
  DebugTrace,
}: ScreenProps<"complement">) {
  const { locked } = screen;
  const partsBefore = model.transportAndEligibility.parts.length;
  return (
    <QuestionnaireForm
      parts={[model.cerfa.part]}
      partsBefore={partsBefore}
      partCount={partsBefore + 1}
      lockedAnswers={locked.answers}
      cibles={locked.preconisation.cibles}
      initialState={screen.resume}
      tracked={false}
      endLabel="Terminer"
      DebugTrace={DebugTrace}
      onComplete={(_, previousState) =>
        goTo({ name: "cerfa", locked, previousState })
      }
    />
  );
}

function FirstResultatScreen({
  screen,
  goTo,
  ...props
}: ScreenProps<"resultat">) {
  return (
    <FirstResultat
      state={screen.previousState}
      onReopen={(resume) => goTo({ name: "questionnaire", resume })}
      onLock={(locked) => goTo({ name: "complement", locked })}
      {...props}
    />
  );
}

function CerfaResultatScreen({ screen, goTo, ...props }: ScreenProps<"cerfa">) {
  const { locked } = screen;
  return (
    <CerfaResultat
      state={screen.previousState}
      locked={locked}
      onReopen={(resume) => goTo({ name: "complement", locked, resume })}
      {...props}
    />
  );
}
