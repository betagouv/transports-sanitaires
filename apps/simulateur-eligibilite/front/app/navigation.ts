// L'écran affiché, et comment on en change : rattachement, seeds, simulateur.
//
// Le rattachement saisi ne passe pas par ici. Il est rangé en session, et
// `rattacher` ne retient que l'accès aux developer tools.

import { useState } from "react";
import type { AccesRattachement } from "../rattachement/RattachementForm";
import type { Seed } from "../seeds/seed";
import type { Answers } from "../simulateur/questionnaire/question";

type Screen = "rattachement" | "seeds" | "simulateur";

export type Navigation = {
  screen: Screen;
  // Le service choisi déverrouille-t-il les developer tools (service n° 4) ?
  // Retenu au rattachement pour les reproposer dans le simulateur. C'est un
  // booléen, pas une identité.
  developerTools: boolean;
  // Les réponses de la seed ouverte, qui pré-remplissent le simulateur.
  seedAnswers: Answers | null;
  // Change à chaque nouvelle simulation. `App` s'en sert pour remonter le
  // simulateur et repartir d'un questionnaire vierge.
  simulationNumber: number;
  // Les developer tools s'ouvrent après le rattachement, comme le simulateur.
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
    // Ouvrir une seed commence une simulation. Rouverte, la même seed repart
    // de ses réponses.
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
