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

// Chargé à la demande : le catalogue et son tableau restent hors du bundle
// initial. Seul le service produit y accède.
const Seeds = lazy(() =>
  import("./Seeds").then((m) => ({
    default: m.Seeds,
  })),
);
