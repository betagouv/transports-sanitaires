// Le rattachement pour la durée de la session : rangé par l'écran-porte, relu par
// le traceur d'analytics à chaque événement.

import type { RattachementSaisi } from "../../shared/rattachement-saisi";

export function rangerRattachement(
  rattachement: RattachementSaisi | null,
): void {
  rattachementCourant = rattachement;
}

/** `null` tant que personne ne s'est rattaché. */
export function rattachementEnSession(): RattachementSaisi | null {
  return rattachementCourant;
}

// ---- implémentation ----

// En mémoire uniquement (pas de localStorage), voir
// docs/knowledge/adr/identification.md, ADR-4.
let rattachementCourant: RattachementSaisi | null = null;
