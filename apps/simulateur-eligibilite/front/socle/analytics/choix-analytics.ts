// Le choix de l'utilisateur sur la mesure d'audience.
//
// L'app tourne dans une iframe du CMS. C'est le CMS qui propose l'opt-out et qui
// nous transmet le choix par `postMessage`. Son script est dans `cms/`.
// Voir docs/knowledge/adr/analytics.md, ADR-5.

export type ChoixAnalytics = "suivi" | "refus";

export type BridgeOptions = {
  /** La page qui embarque l'app (défaut : `window.parent`). */
  parent?: Window;
  /** Passé ce délai sans réponse, la mesure continue. */
  delaiMs?: number;
};

/**
 * Demande le choix à la page qui embarque l'app, puis le suit : `surChoix` est
 * appelé à la réponse et à chaque changement. Hors iframe, ou sans réponse dans
 * le délai, la mesure continue : l'opt-out n'existe que là où le CMS l'offre.
 *
 * Seule la page parente est écoutée. Son origine n'est pas vérifiée : le message
 * ne porte aucune donnée, il arrête ou reprend notre propre mesure.
 */
export function suivreChoixAnalytics(
  surChoix: (choix: ChoixAnalytics) => void,
  { parent = window.parent, delaiMs = DELAI_MS }: BridgeOptions = {},
): void {
  if (parent === window) {
    surChoix("suivi");
    return;
  }
  let repondu = false;
  window.addEventListener("message", (e) => {
    const choix = e.source === parent ? lireChoix(e.data) : null;
    if (!choix) return;
    repondu = true;
    surChoix(choix);
  });
  parent.postMessage({ type: DEMANDE }, "*");
  setTimeout(() => {
    if (!repondu) surChoix("suivi");
  }, delaiMs);
}

// ---- implémentation ----

// Le protocole, que le script du CMS implémente à l'identique.
const DEMANDE = "statistiques-simulateur:demande";
const CHOIX = "statistiques-simulateur:choix";

// Court : la page vue attend la réponse, et le CMS répond dès la demande.
const DELAI_MS = 1000;

function lireChoix(data: unknown): ChoixAnalytics | null {
  if (typeof data !== "object" || data === null) return null;
  const message = data as { type?: unknown; suivi?: unknown };
  if (message.type !== CHOIX || typeof message.suivi !== "boolean") return null;
  return message.suivi ? "suivi" : "refus";
}
