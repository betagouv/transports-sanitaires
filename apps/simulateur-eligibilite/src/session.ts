import { decodeCtx, type Ctx } from "./ctx";

// Contexte d'identification conservé en mémoire de session uniquement (pas de
// localStorage) — voir docs/architecture/identification.md — ADR-4.
let sessionCtx: Ctx | null = null;

/**
 * Lit le contexte dans le fragment d'URL au démarrage, le garde en mémoire, puis
 * retire le fragment de l'URL (`history.replaceState`) pour ne pas le laisser
 * traîner. Idempotent : sans fragment `ctx`, ne touche pas l'URL.
 */
export function initSession(
  location: Location = window.location,
  history: History = window.history
): Ctx | null {
  const ctx = decodeCtx(location.hash);
  if (ctx) {
    sessionCtx = ctx;
    history.replaceState(null, "", location.pathname + location.search);
  }
  return sessionCtx;
}

export function getSessionCtx(): Ctx | null {
  return sessionCtx;
}
