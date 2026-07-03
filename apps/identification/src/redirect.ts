import { encodeCtx, type Ctx } from "./ctx";
import { simulateurBaseUrl } from "./config";

// La navigation top-level depuis l'iframe est autorisée sous activation
// utilisateur (voir docs/architecture/identification.md — §6).

export function simulateurUrl(ctx: Ctx, base = simulateurBaseUrl()): string {
  return `${base}#ctx=${encodeCtx(ctx)}`;
}

/**
 * Navigue en top-level vers le simulateur avec le contexte en fragment.
 * Depuis une iframe cross-origin, écrire `top.location` est autorisé sous
 * activation utilisateur mais le *lire* peut lever ; on retombe alors sur la
 * navigation de la fenêtre courante.
 */
export function goToSimulateur(ctx: Ctx, target: Window = window): void {
  const url = simulateurUrl(ctx);
  try {
    (target.top ?? target).location.assign(url);
  } catch {
    target.location.assign(url);
  }
}
