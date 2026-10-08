// Ce que le questionnaire envoie à l'analytics : son début, chaque étape, sa
// fin, et son abandon si l'onglet est fermé avant.

import { useEffect, useRef } from "react";
import { NomEvenement, trackEvenement } from "../analytics/evenements";

export type QuestionnaireTracking = {
  stepPassed: (page: number) => void;
  questionnaireCompleted: () => void;
};

/**
 * `tracked` : le questionnaire émet-il des évènements ? `resumed` : il a déjà
 * commencé, son début n'est pas réémis.
 */
export function useQuestionnaireTracking(
  current: number,
  tracked: boolean,
  resumed: boolean,
): QuestionnaireTracking {
  const completed = useRef(false);
  // Une ref donne la valeur fraîche au gestionnaire, sans redéclarer l'écouteur.
  const currentRef = useRef(current);
  currentRef.current = current;
  // biome-ignore lint/correctness/useExhaustiveDependencies: amorçage unique au montage
  useEffect(() => {
    if (!tracked) return;
    if (!resumed) trackEvenement(NomEvenement.simulationStart);
    const onLeave = () => {
      if (!completed.current)
        trackEvenement(NomEvenement.simulationAbandon, currentRef.current);
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

  return {
    stepPassed: (page) => {
      if (tracked) trackEvenement(NomEvenement.simulationStep, page);
    },
    questionnaireCompleted: () => {
      completed.current = true;
      if (tracked) trackEvenement(NomEvenement.simulationComplete);
    },
  };
}
