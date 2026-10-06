// Le simulateur : un questionnaire, son résultat, puis le complément posé une
// fois le résultat verrouillé.
//
// Tant que le résultat n'est pas verrouillé, « Précédent » rouvre le
// questionnaire sur sa dernière page, réponses intactes. C'est l'action
// principale du résultat qui verrouille : le complément est un second questionnaire,
// qui reçoit les réponses acquises sans en reposer aucune, et dont la première
// page n'a pas de « Précédent ». Le verrou tient à ce montage, pas à un drapeau.

import { type ComponentType, type ReactNode, useState } from "react";
import {
  decide,
  PAGES_AFTER_LOCK,
  PAGES_BEFORE_LOCK,
  PART_COUNT,
} from "./fake-questionnaire";
import {
  type DebugTraceProps,
  QuestionnaireForm,
} from "./questionnaire/QuestionnaireForm";
import { type Answers, askedPages } from "./questionnaire/question";
import type { QuestionnaireState } from "./questionnaire/questionnaire";
import { stateAfterAnswers } from "./questionnaire/questionnaire";

type Props = {
  onNewSimulation: () => void;
  // Seed : pré-remplit le questionnaire. Complète, elle ouvre le résultat ;
  // sinon, la première page qu'elle laisse sans réponse.
  seedAnswers?: Answers | null;
  // Encadré des developer tools, rendu tel quel sous le questionnaire. Le
  // simulateur sait *où* il s'affiche, pas ce qu'il contient : c'est `App` qui le
  // compose, et il est absent hors du service produit.
  developerToolsPanel?: ReactNode;
  // Trace de debug, rendue sous le questionnaire et sous les résultats. Même
  // garde que le panneau ci-dessus. C'est un composant et non du contenu
  // composé : le simulateur lui donne l'état vivant du questionnaire, qu'`App` n'a
  // pas sous la main.
  DebugTrace?: ComponentType<DebugTraceProps>;
};

export function Simulateur({
  onNewSimulation,
  seedAnswers = null,
  developerToolsPanel,
  DebugTrace,
}: Props) {
  const [screen, goTo] = useState<Screen>(() => startingScreen(seedAnswers));
  const commun = { goTo, DebugTrace, onRestart: onNewSimulation };

  switch (screen.name) {
    case "questionnaire":
      return (
        <>
          <InitialQuestionnaire screen={screen} {...commun} />
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

// `previousState` est le questionnaire qu'un résultat a derrière lui : c'est lui que
// « Précédent » rouvre. Passé le verrou, l'état du questionnaire n'est plus
// porté par aucun écran : il n'y a plus rien à rouvrir.
type Screen =
  | { name: "questionnaire"; resume?: QuestionnaireState }
  | { name: "result"; previousState: QuestionnaireState }
  | { name: "complement"; locked: Answers; resume?: QuestionnaireState }
  | { name: "end"; locked: Answers; previousState: QuestionnaireState };

type ScreenProps<Name extends Screen["name"]> = {
  screen: Extract<Screen, { name: Name }>;
  goTo: (screen: Screen) => void;
  DebugTrace?: ComponentType<DebugTraceProps>;
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
    ? { name: "result", previousState: state }
    : { name: "questionnaire", resume: state };
}

function InitialQuestionnaire({
  screen,
  goTo,
  DebugTrace,
}: ScreenProps<"questionnaire">) {
  return (
    <>
      <h1 className="fr-h3">Questionnaire factice</h1>
      <div className="fr-alert fr-alert--info fr-alert--sm fr-mb-4w">
        <p>
          Ce questionnaire ne décide rien. Il éprouve la navigation, le temps
          que le modèle d’éligibilité suivant soit intégré.
        </p>
      </div>
      <QuestionnaireForm
        pages={PAGES_BEFORE_LOCK}
        partCount={PART_COUNT}
        initialState={screen.resume}
        tracked
        endLabel="Voir le résultat"
        DebugTrace={DebugTrace}
        onComplete={(_, previousState) =>
          goTo({ name: "result", previousState })
        }
      />
    </>
  );
}

// Le verrou ne s'annonce pas à l'écran : l'interface nomme l'action, et le
// « Précédent » de cette page dit ce qui reste ouvert.
function ResultToLock({
  screen,
  goTo,
  DebugTrace,
  onRestart,
}: ScreenProps<"result">) {
  const { answers } = screen.previousState;
  const outputs = decide(answers);
  const reopen = () =>
    goTo({ name: "questionnaire", resume: screen.previousState });
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
      {DebugTrace && (
        <DebugTrace
          title="résultat"
          pages={askedPages(PAGES_BEFORE_LOCK, answers)}
          answers={answers}
          outputs={outputs}
        />
      )}
    </>
  );
}

// Le complément n'émet pas d'évènement : ce qu'on y mesurera se décidera avec
// les documents du modèle suivant.
function Complement({ screen, goTo, DebugTrace }: ScreenProps<"complement">) {
  const { locked } = screen;
  return (
    <>
      <h1 className="fr-h3">Compléter la commande</h1>
      <QuestionnaireForm
        pages={PAGES_AFTER_LOCK}
        partCount={PART_COUNT}
        lockedAnswers={locked}
        initialState={screen.resume}
        tracked={false}
        endLabel="Terminer"
        DebugTrace={DebugTrace}
        onComplete={(_, previousState) =>
          goTo({ name: "end", locked, previousState })
        }
      />
    </>
  );
}

// « Précédent » revient au complément, jamais en deçà du verrou.
function CompletedOrder({
  screen,
  goTo,
  DebugTrace,
  onRestart,
}: ScreenProps<"end">) {
  const { answers } = screen.previousState;
  const outputs = decide(answers);
  const reopen = () =>
    goTo({
      name: "complement",
      locked: screen.locked,
      resume: screen.previousState,
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
      {DebugTrace && (
        <DebugTrace
          title="commande complétée"
          pages={askedPages(ALL_PAGES, answers)}
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

const ALL_PAGES = [...PAGES_BEFORE_LOCK, ...PAGES_AFTER_LOCK];
