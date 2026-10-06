// Ce qu'un parcours de questions signale à l'analytics : son début, chaque étape
// franchie, sa conclusion, et son abandon, si l'onglet est quitté avant la fin.
//
// Rassemblé ici pour que `passation.ts` n'ait à connaître ni le vocabulaire
// mesuré ni le moment où chaque événement part.

import { useEffect, useRef } from "react";
import { NomEvenement, trackEvenement } from "../../analytics/evenements";

export type SuiviDeParcours = {
  etapeFranchie: (page: number) => void;
  parcoursConclu: () => void;
};

/**
 * `mesure` : le parcours émet-il quoi que ce soit ? `reprise` : il a déjà
 * commencé, son début n'est pas réémis.
 */
export function useSuiviDeParcours(
  current: number,
  mesure: boolean,
  reprise: boolean,
): SuiviDeParcours {
  const termine = useRef(false);
  // Refs pour éviter les valeurs périmées dans le gestionnaire : `currentRef`
  // existe pour lire la valeur fraîche sans redéclarer l'écouteur.
  const currentRef = useRef(current);
  currentRef.current = current;
  // biome-ignore lint/correctness/useExhaustiveDependencies: amorçage unique au montage
  useEffect(() => {
    if (!mesure) return;
    if (!reprise) trackEvenement(NomEvenement.simulationStart);
    const onLeave = () => {
      if (!termine.current)
        trackEvenement(NomEvenement.simulationAbandon, currentRef.current);
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

  return {
    etapeFranchie: (page) => {
      if (mesure) trackEvenement(NomEvenement.simulationStep, page);
    },
    parcoursConclu: () => {
      termine.current = true;
      if (mesure) trackEvenement(NomEvenement.simulationComplete);
    },
  };
}
