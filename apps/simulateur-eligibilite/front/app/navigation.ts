// Où l'on se trouve dans l'application, et comment on en change : l'écran de rattachement
// de rattachement, l'écran des seeds qui s'y superpose, et le simulateur
// affiché derrière.
//
// Le rattachement, lui, ne transite pas par ici : l'écran de rattachement le range en session,
// et `rattacher` ne retient que le booléen d'accès aux developer tools.

import { useState } from "react";
import type { AccesRattachement } from "../rattachement/RattachementForm";
import type { Seed } from "../seeds/seed";
import type { Answers } from "../simulateur/questionnaire/question";

type Screen = "rattachement" | "seeds" | "simulateur";

export type Navigation = {
  screen: Screen;
  // Le service choisi déverrouille-t-il les developer tools (service n° 4) ?
  // Retenu à la validation pour pouvoir les reproposer au début du parcours.
  // C'est un booléen, pas une identité : l'invariant de `docs/knowledge` tient.
  developerTools: boolean;
  // Les réponses de la seed ouverte, qui pré-remplissent le simulateur.
  seedAnswers: Answers | null;
  // Change à chaque nouvelle simulation. `App` s'en sert pour remonter le
  // simulateur et repartir d'un parcours vierge.
  simulationNumber: number;
  // Les developer tools s'ouvrent **après** l'écran de rattachement : on entre rattaché,
  // quelle que soit la destination.
  rattacher: (acces: AccesRattachement) => void;
  // Ouvre la seed choisie : son résultat si elle est complète, sinon la
  // première page qu'elle laisse sans réponse.
  openSeed: (seed: Seed) => void;
  openSeeds: () => void;
  closeTool: () => void;
  restart: () => void;
};

export function useNavigation(): Navigation {
  const [state, setState] = useState<State>({
    screen: "rattachement",
    developerTools: false,
    seedAnswers: null,
    simulationNumber: 0,
  });
  const patch = (partial: Partial<State>) =>
    setState((current) => ({ ...current, ...partial }));

  return { ...state, ...actions(state, patch) };
}

// ---- implémentation ----

type State = Pick<
  Navigation,
  "screen" | "developerTools" | "seedAnswers" | "simulationNumber"
>;

function actions(
  state: State,
  patch: (partial: Partial<State>) => void,
): Omit<Navigation, keyof State> {
  return {
    rattacher: (acces) =>
      patch({
        screen: acces.destination,
        developerTools: acces.developerTools,
      }),
    // Ouvrir une seed commence une simulation : la même seed peut être
    // rouverte, et repart alors de ses réponses.
    openSeed: (seed) =>
      patch({
        screen: "simulateur",
        seedAnswers: seed.answers,
        simulationNumber: state.simulationNumber + 1,
      }),
    openSeeds: () => patch({ screen: "seeds" }),
    closeTool: () => patch({ screen: "simulateur" }),
    restart: () =>
      patch({
        screen: "simulateur",
        seedAnswers: null,
        simulationNumber: state.simulationNumber + 1,
      }),
  };
}
