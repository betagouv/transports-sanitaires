// Le transport des événements vers Matomo : amorçage du tag, injection du script,
// mise en forme d'un `trackEvent`. Le vocabulaire mesuré, lui, est dans
// `evenements.ts` — ce fichier ne sait pas ce que le produit compte.

import type { IdentitePseudonymisee } from "../../shared/identite-pseudonymisee";
import { identiteEnSession } from "../identification/session";

declare global {
  interface Window {
    // File d'attente du tag Matomo : ce qu'on y empile avant le chargement de
    // matomo.js est rejoué par le script au démarrage.
    _paq?: unknown[][];
  }
}

export type AnalyticsConfig = {
  enabled: boolean;
  url: string;
  siteId: string;
};

/**
 * Résout la configuration depuis l'environnement. Activé seulement en build de
 * prod (ou via `VITE_MATOMO_ENABLED=true` pour tester en local) **et** si le
 * consentement est accordé (ADR-3 — phase expérimentale : accordé par défaut,
 * sans bandeau ; point de décision isolé pour brancher un vrai bandeau).
 */
export function configDepuisEnv(env: Env = import.meta.env): AnalyticsConfig {
  const consentement = true; // ADR-3 — à remplacer par la gestion du consentement
  const activable = env.PROD === true || env.VITE_MATOMO_ENABLED === "true";
  return {
    enabled: activable && consentement,
    url: env.VITE_MATOMO_URL || DEFAULT_URL,
    siteId: env.VITE_MATOMO_SITE_ID || DEFAULT_SITE_ID,
  };
}

/**
 * Configure le traceur : si activé, empile les commandes d'amorçage dans `_paq`
 * (avant le chargement de matomo.js, qui traitera la file). Appelé au boot, avant
 * l'identification : l'identité prescripteur n'est **pas** connue ici — elle est lue
 * en session au moment d'émettre chaque événement (voir `emettre`). N'injecte
 * **pas** le script tiers — c'est le rôle de `chargerMatomo`, appelé séparément
 * (garde les tests sans effet de bord réseau).
 *
 * **Cookieless** (`disableCookies`) : l'app tourne dans l'iframe du CMS (contexte
 * tiers → cookies bloqués), et la mesure d'audience se veut sans bandeau.
 */
export function initAnalytics(config: AnalyticsConfig): void {
  etat = { enabled: config.enabled };
  if (!config.enabled) return;

  const paq = filePaq();
  paq.push(["disableCookies"]);
  paq.push(["setTrackerUrl", `${config.url}matomo.php`]);
  paq.push(["setSiteId", config.siteId]);
  paq.push(["enableLinkTracking"]);
  paq.push(["trackPageView"]);
}

/** Injecte le script matomo.js (idempotent). */
export function chargerMatomo(url: string): void {
  if (document.getElementById("matomo-js")) return;
  const script = document.createElement("script");
  script.id = "matomo-js";
  script.async = true;
  script.src = `${url}matomo.js`;
  document.head.appendChild(script);
}

/**
 * Émet un événement quand le traceur est activé, en portant l'identité
 * pseudonymisée courante lue en session (cf. `initAnalytics` pour le cycle de vie).
 */
export function emettre(action: string, value?: number): void {
  if (!etat.enabled) return;
  filePaq().push(construireEvenement(identiteEnSession(), action, value));
}

/**
 * Construit un événement Matomo `trackEvent` : catégorie constante, action, puis
 * `prescripteurRef` en **Nom** (s'il existe) et une valeur numérique optionnelle.
 *
 * L'instance mutualisée beta.gouv n'offre pas de custom dimension (R-8) : le
 * `prescripteurRef` pseudonymisé (identification.md — ADR-4) est donc porté en
 * propriété d'événement, faute de mieux. Exporté pour les tests.
 */
export function construireEvenement(
  identite: IdentitePseudonymisee | null,
  action: string,
  value?: number,
): unknown[] {
  const event: unknown[] = ["trackEvent", CATEGORY, action];
  const name = identite?.prescripteurRef;
  if (name !== undefined) event.push(name);
  if (value !== undefined) {
    if (name === undefined) event.push(""); // Matomo : le Nom précède la Valeur
    event.push(value);
  }
  return event;
}

// ---- implémentation ----

type Env = {
  PROD?: boolean;
  VITE_MATOMO_ENABLED?: string;
  VITE_MATOMO_URL?: string;
  VITE_MATOMO_SITE_ID?: string;
};

let etat: { enabled: boolean } = { enabled: false };

// Unique point de création de la file : le tag la remplace par un objet actif
// quand matomo.js se charge, tout ce qui est empilé avant est rejoué.
function filePaq(): unknown[][] {
  window._paq ??= [];
  return window._paq;
}

const CATEGORY = "simulateur";
// Instance mutualisée beta.gouv, site 275. Intégration par le tag de suivi
// (`_paq` + matomo.js), **pas** par le Tag Manager.
const DEFAULT_URL = "https://stats.beta.gouv.fr/";
const DEFAULT_SITE_ID = "275";
