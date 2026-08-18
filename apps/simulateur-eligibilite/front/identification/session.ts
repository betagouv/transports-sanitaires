// L'identité pseudonymisée du prescripteur pour la durée de la session : rangée
// par l'écran-porte, relue par le traceur d'analytics à chaque événement.

import type { IdentitePseudonymisee } from "../../shared/identite-pseudonymisee";

export function rangerIdentite(identite: IdentitePseudonymisee | null): void {
  identiteCourante = identite;
}

export function identiteEnSession(): IdentitePseudonymisee | null {
  return identiteCourante;
}

// ---- implémentation ----

// En mémoire uniquement (pas de localStorage) — voir
// docs/architecture/identification.md — ADR-4.
let identiteCourante: IdentitePseudonymisee | null = null;
