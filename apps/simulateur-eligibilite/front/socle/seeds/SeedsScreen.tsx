// L'écran des seeds, chargé à la demande.
//
// Ce fichier est le seul du module dans le bundle initial. Il ne doit importer
// ni le catalogue ni le tableau (`scripts/verifier-bundle.ts` le vérifie).

import { lazy, Suspense, useEffect, useState } from "react";
import type { Model } from "../model";
import type { Seed } from "./seed";

type Props = {
  /** Le modèle dont on rejoue les seeds. */
  model: Model;
  onOpen: (seed: Seed) => void;
  onBack: () => void;
};

export function SeedsScreen({ model, onOpen, onBack }: Props) {
  const seeds = useCatalogue(model);
  if (!seeds) return null;
  return (
    <Suspense fallback={null}>
      <Seeds seeds={seeds} model={model} onOpen={onOpen} onBack={onBack} />
    </Suspense>
  );
}

// ---- implémentation ----

// Chargé à la demande : le tableau reste hors du bundle initial. Seul le service
// produit y accède.
const Seeds = lazy(() =>
  import("./Seeds").then((m) => ({
    default: m.Seeds,
  })),
);

// Le catalogue du modèle, demandé à l'ouverture de l'écran. `undefined` tant
// qu'il n'est pas arrivé.
function useCatalogue(model: Model): readonly Seed[] | undefined {
  const [seeds, setSeeds] = useState<readonly Seed[]>();
  useEffect(() => {
    let active = true;
    model.seeds().then((catalogue) => {
      // L'écran a pu être quitté entre-temps.
      if (active) setSeeds(catalogue);
    });
    return () => {
      active = false;
    };
  }, [model]);
  return seeds;
}
