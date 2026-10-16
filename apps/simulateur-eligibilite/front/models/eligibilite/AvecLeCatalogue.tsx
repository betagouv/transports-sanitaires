// Ce qui entoure tout résultat qui lit les textes de l'éditeur (D-112) : le
// catalogue se charge à la demande (900 ko, hors du chunk d'entrée), derrière
// un `Suspense`. Le chargement en échec s'annonce, sans rien inventer.

import { type ReactNode, Suspense, use } from "react";
import { catalogueDeLaSession } from "./catalogue-resultats";
import type { CatalogueResultats } from "./declarations/catalogue-resultats";

type Props = { children: (catalogue: CatalogueResultats) => ReactNode };

export function AvecLeCatalogue({ children }: Props) {
  return (
    <Suspense fallback={<p aria-live="polite">Chargement du résultat…</p>}>
      <Charge>{children}</Charge>
    </Suspense>
  );
}

// ---- implémentation ----

function Charge({ children }: Props) {
  const chargement = use(catalogueDeLaSession());
  if ("echec" in chargement) return <ChargementEnEchec />;
  return children(chargement.catalogue);
}

function ChargementEnEchec() {
  return (
    <p role="alert">
      Les textes du résultat n’ont pas pu être chargés. Rechargez la page.
    </p>
  );
}
