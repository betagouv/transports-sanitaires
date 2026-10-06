// L'écran des seeds, chargé à la demande.
//
// Ce fichier est le seul du module dans le bundle initial. Il ne doit importer
// ni le catalogue ni le tableau (`scripts/verifier-bundle.ts` le vérifie).

import { lazy, Suspense } from "react";
import type { Seed } from "./seed";

type Props = {
  /** Injectable pour les tests (défaut = le catalogue). */
  seeds?: readonly Seed[];
  onOuvrir: (seed: Seed) => void;
  onRetour: () => void;
};

export function SeedsScreen(props: Props) {
  return (
    <Suspense fallback={null}>
      <Seeds {...props} />
    </Suspense>
  );
}

// ---- implémentation ----

// Chargé à la demande, pour que le catalogue de seeds et son tableau restent hors
// du bundle initial : seul le service produit y accède (cf. `developerTools`), la
// très grande majorité des prescripteurs ne le réclamera jamais.
const Seeds = lazy(() =>
  import("./Seeds").then((m) => ({
    default: m.Seeds,
  })),
);
