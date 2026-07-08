import type { Contexte } from "../../shared/contexte";

// Contexte d'identification conservé en mémoire de session uniquement (pas de
// localStorage) — voir docs/architecture/identification.md — ADR-4. Renseigné par
// l'écran d'identification (App) une fois le prescripteur validé, puis lu par le
// traceur d'analytics au moment d'émettre les événements.
let contexteSession: Contexte | null = null;

export function setSessionContexte(contexte: Contexte | null): void {
  contexteSession = contexte;
}

export function getSessionContexte(): Contexte | null {
  return contexteSession;
}
