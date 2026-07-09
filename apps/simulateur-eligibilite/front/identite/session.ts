import type { IdentitePseudonymisee } from "../../shared/identite-pseudonymisee";

// Identité pseudonymisée conservée en mémoire de session uniquement (pas de
// localStorage) — voir docs/architecture/identification.md — ADR-4. Renseignée par
// l'écran d'identification (App) une fois le prescripteur validé, puis lue par le
// traceur d'analytics au moment d'émettre les événements.
let identiteCourante: IdentitePseudonymisee | null = null;

export function setIdentite(identite: IdentitePseudonymisee | null): void {
  identiteCourante = identite;
}

export function getIdentite(): IdentitePseudonymisee | null {
  return identiteCourante;
}
