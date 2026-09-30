// Le choix de l'utilisateur sur la mesure d'audience. L'app vit dans une iframe du
// CMS, et c'est le CMS qui offre l'opt-out, dans son pied de page : il tient le
// choix sur son domaine, et le transmet par `postMessage`. Le script qui répond
// côté CMS est versionné dans `cms/`. Voir docs/knowledge/adr/analytics.md, ADR-5.

export type ChoixStatistiques = "suivi" | "refus";

export type OptionsDuPont = {
  /** La page qui embarque l'app (défaut : `window.parent`). */
  parent?: Window;
  /** Au-delà, sans réponse, la mesure suit son cours. */
  delaiMs?: number;
};

/**
 * Demande le choix à la page qui embarque l'app, puis le suit : `surChoix` est
 * rappelé à la réponse et à chaque changement. Hors iframe, ou sans réponse dans
 * le délai, la mesure suit son cours : l'opt-out n'existe que là où le CMS
 * l'offre.
 *
 * Seule la page parente est écoutée. Son origine n'est pas vérifiée : le message
 * ne porte aucune donnée, et ne fait qu'arrêter ou reprendre notre propre mesure.
 */
export function suivreChoixStatistiques(
  surChoix: (choix: ChoixStatistiques) => void,
  { parent = window.parent, delaiMs = DELAI_MS }: OptionsDuPont = {},
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

// Court : la page vue attend la réponse, et le script du CMS répond dès que
// l'iframe demande.
const DELAI_MS = 1000;

function lireChoix(data: unknown): ChoixStatistiques | null {
  if (typeof data !== "object" || data === null) return null;
  const message = data as { type?: unknown; suivi?: unknown };
  if (message.type !== CHOIX || typeof message.suivi !== "boolean") return null;
  return message.suivi ? "suivi" : "refus";
}
