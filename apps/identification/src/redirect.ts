import { simulateurBaseUrl } from "./config";
import type { Selection } from "./selection";

// À la validation, le backend construit le contexte pseudonymisé (#ctx) : le
// secret HMAC reste côté serveur (voir server/contexte.ts). Le front ne fait
// qu'appeler l'API same-origin puis naviguer en top-level vers le simulateur.
// La navigation top-level depuis l'iframe est autorisée sous activation
// utilisateur (docs/architecture/identification.md — §6).

/** Demande au backend le fragment `ctx` encodé pour la sélection. */
export async function fetchContexte(sel: Selection): Promise<string> {
  const res = await fetch("/api/contexte", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sel),
  });
  if (!res.ok) throw new Error(`/api/contexte → HTTP ${res.status}`);
  const { ctx } = (await res.json()) as { ctx: string };
  return ctx;
}

export function simulateurUrl(encodedCtx: string, base = simulateurBaseUrl()): string {
  return `${base}#ctx=${encodedCtx}`;
}

/**
 * Navigue en top-level vers `url`. Depuis une iframe cross-origin, écrire
 * `top.location` est autorisé sous activation utilisateur mais le *lire* peut
 * lever ; on retombe alors sur la fenêtre courante.
 */
export function navigate(url: string, target: Window = window): void {
  try {
    (target.top ?? target).location.assign(url);
  } catch {
    target.location.assign(url);
  }
}

/**
 * Construit le contexte via le backend puis navigue vers le simulateur. En cas
 * d'échec de l'API, on rejoint quand même le simulateur **sans** contexte
 * (dégradation : la simulation reste accessible, le suivi analytics est perdu).
 */
export async function goToSimulateur(
  sel: Selection,
  target: Window = window
): Promise<void> {
  try {
    navigate(simulateurUrl(await fetchContexte(sel)), target);
  } catch (err) {
    console.error("[identification] contexte indisponible:", err);
    navigate(simulateurBaseUrl(), target);
  }
}
