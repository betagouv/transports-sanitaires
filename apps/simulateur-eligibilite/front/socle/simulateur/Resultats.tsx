// Les deux résultats du parcours : le premier, que le verrou suit, et celui du
// cerfa. Le modèle fournit leur contenu ; le cadre, le stepper et les boutons
// sont ici.

import type { ComponentType, ReactNode } from "react";
import { type Model, preconisationOf } from "../model";
import type { DebugTraceProps } from "../questionnaire-engine/QuestionnaireForm";
import { askedPages, pagesOf } from "../questionnaire-engine/question";
import type { QuestionnaireState } from "../questionnaire-engine/questionnaire";
import { Stepper } from "../questionnaire-engine/Stepper";
import type { Locked } from "./start";

type Props = {
  model: Model;
  /** Le questionnaire derrière ce résultat : « Précédent » le rouvre. */
  state: QuestionnaireState;
  DebugTrace?: ComponentType<DebugTraceProps>;
  onReopen: (state: QuestionnaireState) => void;
  onRestart: () => void;
};

// Le verrou ne s'annonce pas à l'écran : l'interface nomme l'action, et le
// « Précédent » de cette page dit ce qui reste ouvert. Sans cerfa, rien ne suit
// ce résultat : le stepper s'arrête sur lui.
export function FirstResultat({
  model,
  state,
  DebugTrace,
  onReopen,
  onLock,
  onRestart,
}: Props & { onLock: (locked: Locked) => void }) {
  const { answers } = state;
  const preconisation = preconisationOf(model, answers);
  const { parts, title, Resultat } = model.transportAndEligibility;
  const hasCerfa = model.cerfa.form(preconisation.cibles) !== null;
  const pages = askedPages(pagesOf(parts), answers);
  return (
    <Frame
      title={title}
      part={parts.length}
      total={parts.length + (hasCerfa ? 1 : 0)}
      trace={{ title: "résultat", pages, answers, ...preconisation }}
      DebugTrace={DebugTrace}
    >
      <Resultat answers={answers} cibles={preconisation.cibles} />
      <div className="fr-btns-group fr-btns-group--inline">
        <SecondaryButton onClick={() => onReopen(state)}>
          Précédent
        </SecondaryButton>
        {hasCerfa && (
          <PrimaryButton onClick={() => onLock({ answers, preconisation })}>
            {model.cerfa.startLabel}
          </PrimaryButton>
        )}
        <SecondaryButton onClick={onRestart}>
          Nouvelle simulation
        </SecondaryButton>
      </div>
    </Frame>
  );
}

// « Précédent » revient au second questionnaire, jamais avant le verrou. La
// préconisation affichée est celle que le verrou a figée.
export function CerfaResultat({
  model,
  state,
  locked,
  DebugTrace,
  onReopen,
  onRestart,
}: Props & { locked: Locked }) {
  const { answers } = state;
  const { cibles } = locked.preconisation;
  const { part, title, Resultat } = model.cerfa;
  const total = model.transportAndEligibility.parts.length + 1;
  const all = [...pagesOf(model.transportAndEligibility.parts), ...part.pages];
  const pages = askedPages(all, answers, cibles);
  return (
    <Frame
      title={title}
      part={total}
      total={total}
      trace={{ title: "cerfa", pages, answers, ...locked.preconisation }}
      DebugTrace={DebugTrace}
    >
      <Resultat answers={answers} cibles={cibles} />
      <div className="fr-btns-group fr-btns-group--inline">
        <SecondaryButton onClick={() => onReopen(state)}>
          Précédent
        </SecondaryButton>
        <PrimaryButton onClick={onRestart}>Nouvelle simulation</PrimaryButton>
      </div>
    </Frame>
  );
}

// ---- implémentation ----

function Frame({
  title,
  part,
  total,
  trace,
  DebugTrace,
  children,
}: {
  title: string;
  part: number;
  total: number;
  trace: DebugTraceProps;
  DebugTrace?: ComponentType<DebugTraceProps>;
  children: ReactNode;
}) {
  return (
    <>
      <h1 className="fr-h3">{title}</h1>
      <Stepper part={part} total={total} />
      {children}
      {DebugTrace && <DebugTrace {...trace} />}
    </>
  );
}

type ButtonProps = { onClick: () => void; children: ReactNode };

function PrimaryButton({ onClick, children }: ButtonProps) {
  return (
    <button type="button" className="fr-btn" onClick={onClick}>
      {children}
    </button>
  );
}

function SecondaryButton({ onClick, children }: ButtonProps) {
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
