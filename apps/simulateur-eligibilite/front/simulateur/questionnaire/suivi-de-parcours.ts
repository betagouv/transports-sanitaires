// Ce qu'un parcours de questions signale à l'analytics : son début, chaque étape
// franchie, sa conclusion — et son abandon, si l'onglet est quitté avant la fin.
//
// Rassemblé ici pour que `passation.ts` n'ait à connaître ni le vocabulaire
// mesuré ni le moment où chaque événement part.

import { type RefObject, useEffect, useRef } from "react";
import { NomEvenement, trackEvenement } from "../../analytics/evenements";
import type { Outil } from "../../app/outil";

export type SuiviDeParcours = {
  /** Le parcours s'est-il conclu ? Sans lui, l'abandon partirait même après. */
  termine: RefObject<boolean>;
  etapeFranchie: (page: number) => void;
  parcoursConclu: () => void;
};

export function useSuiviDeParcours(
  outil: Outil,
  current: number,
  actif: boolean,
): SuiviDeParcours {
  // Noms résolus une fois : raccourcit chaque appel ci-dessous.
  const nom = NomEvenement[outil];
  const termine = useRef(false);
  // Refs pour éviter les valeurs périmées dans le gestionnaire : déclarer
  // `actif` et `outil` en dépendances rejouerait `simulation_start` à chaque
  // changement, `currentRef` existe justement pour lire la valeur fraîche sans
  // redéclarer l'écouteur.
  const currentRef = useRef(current);
  currentRef.current = current;
  // biome-ignore lint/correctness/useExhaustiveDependencies: amorçage unique au montage
  useEffect(() => {
    if (!actif) return;
    trackEvenement(nom.simulationStart);
    const onLeave = () => {
      if (!termine.current)
        trackEvenement(nom.simulationAbandon, currentRef.current);
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, []);

  return {
    termine,
    etapeFranchie: (page) => trackEvenement(nom.simulationStep, page),
    parcoursConclu: () => {
      termine.current = true;
      trackEvenement(nom.simulationComplete);
    },
  };
}
