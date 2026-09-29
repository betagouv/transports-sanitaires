// Le rattachement pseudonymisé pour la durée de la session : rangé par
// l'écran-porte, relu par le traceur d'analytics à chaque événement.

import type { RattachementPseudonymise } from "../../shared/rattachement-pseudonymise";

export function rangerRattachement(
  rattachement: RattachementPseudonymise | null,
): void {
  rattachementCourant = rattachement;
}

export function rattachementEnSession(): RattachementPseudonymise | null {
  return rattachementCourant;
}

// ---- implémentation ----

// En mémoire uniquement (pas de localStorage), voir
// docs/knowledge/adr/identification.md, ADR-4.
let rattachementCourant: RattachementPseudonymise | null = null;
