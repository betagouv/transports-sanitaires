// Ce qu'un parcours de questions signale à l'analytics : son début, chaque étape
// franchie, sa conclusion, et son abandon, si l'onglet est quitté avant la fin.
//
// Rassemblé ici pour que `flow.ts` n'ait à connaître ni le vocabulaire
// mesuré ni le moment où chaque événement part.

import { useEffect, useRef } from "react";
import { NomEvenement, trackEvenement } from "../../analytics/evenements";

export type QuestionnaireTracking = {
  stepPassed: (page: number) => void;
  questionnaireCompleted: () => void;
};

/**
 * `tracked` : le parcours émet-il quoi que ce soit ? `resumed` : il a déjà
 * commencé, son début n'est pas réémis.
 */
export function useQuestionnaireTracking(
  current: number,
  tracked: boolean,
  resumed: boolean,
): QuestionnaireTracking {
  const completed = useRef(false);
  // Refs pour éviter les valeurs périmées dans le gestionnaire : `currentRef`
  // existe pour lire la valeur fraîche sans redéclarer l'écouteur.
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
