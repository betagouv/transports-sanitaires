// Traceur d'analytics Matomo. Voir docs/architecture/analytics.md.
//
// Instance mutualisée beta.gouv (stats.beta.gouv.fr, site 275). L'intégration se
// fait via le tag de suivi (`_paq` + matomo.js), **pas** via le Tag Manager, et
// n'utilise **pas** de custom dimension (indisponible sur l'instance mutualisée —
// R-8) : le `prescripteurRef` pseudonymisé (cf. identification.md — ADR-4) est
// porté **en propriété d'événement** (le « Nom » de l'événement Matomo).
//
// Contraintes respectées ici :
//   - init conditionnée au **consentement** (ADR-3) et au **gating** dev/prod ;
//   - le tracking est un no-op tant qu'il n'est pas activé (dev, tests, refus) ;
//   - **cookieless** (`disableCookies`) : l'app tourne dans l'iframe du CMS
//     (contexte tiers → cookies bloqués), et la mesure d'audience se veut sans
//     bandeau ;
//   - l'identité prescripteur (connue **après** l'étape d'identification) est lue
//     depuis la session au moment d'émettre chaque événement.

import { getIdentite } from "../identite/session";
import type { IdentitePseudonymisee } from "../../shared/identite-pseudonymisee";

declare global {
  interface Window {
    _paq?: unknown[][];
  }
}

const CATEGORY = "simulateur";

export type AnalyticsConfig = {
  enabled: boolean;
  url: string;
  siteId: string;
};

type Env = {
  PROD?: boolean;
  VITE_MATOMO_ENABLED?: string;
  VITE_MATOMO_URL?: string;
  VITE_MATOMO_SITE_ID?: string;
};

const DEFAULT_URL = "https://stats.beta.gouv.fr/";
const DEFAULT_SITE_ID = "275";

/**
 * Construit un événement Matomo `trackEvent` : catégorie constante, action, puis
 * `prescripteurRef` en **Nom** (s'il existe) et une valeur numérique optionnelle.
 */
export function buildEvent(
  identite: IdentitePseudonymisee | null,
  action: string,
  value?: number
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

/**
 * Résout la configuration depuis l'environnement. Activé seulement en build de
 * prod (ou via `VITE_MATOMO_ENABLED=true` pour tester en local) **et** si le
 * consentement est accordé (ADR-3 — phase expérimentale : accordé par défaut,
 * sans bandeau ; point de décision isolé pour brancher un vrai bandeau).
 */
export function resolveConfig(env: Env = import.meta.env): AnalyticsConfig {
  const consentement = true; // ADR-3 — à remplacer par la gestion du consentement
  const activable = env.PROD === true || env.VITE_MATOMO_ENABLED === "true";
  return {
    enabled: activable && consentement,
    url: env.VITE_MATOMO_URL || DEFAULT_URL,
    siteId: env.VITE_MATOMO_SITE_ID || DEFAULT_SITE_ID,
  };
}

let state: { enabled: boolean } = { enabled: false };

/**
 * Configure le traceur : si activé, empile les commandes d'amorçage dans `_paq`
 * (avant le chargement de matomo.js, qui traitera la file). Appelé au boot, avant
 * l'identification : l'identité prescripteur n'est **pas** connue ici — elle est lue
 * en session au moment d'émettre chaque événement (voir `track`). N'injecte
 * **pas** le script tiers — c'est le rôle de `loadMatomo`, appelé séparément
 * (garde les tests sans effet de bord réseau).
 */
export function initAnalytics(config: AnalyticsConfig): void {
  state = { enabled: config.enabled };
  if (!config.enabled) return;

  const paq = (window._paq ??= []);
  paq.push(["disableCookies"]);
  paq.push(["setTrackerUrl", config.url + "matomo.php"]);
  paq.push(["setSiteId", config.siteId]);
  paq.push(["enableLinkTracking"]);
  paq.push(["trackPageView"]);
}

/** Injecte le script matomo.js (idempotent). */
export function loadMatomo(url: string): void {
  if (document.getElementById("matomo-js")) return;
  const script = document.createElement("script");
  script.id = "matomo-js";
  script.async = true;
  script.src = url + "matomo.js";
  document.head.appendChild(script);
}

export const trackSimulationStart = (): void => track("simulation_start");
export const trackSimulationStep = (stepIndex: number): void =>
  track("simulation_step", stepIndex);
export const trackSimulationComplete = (): void => track("simulation_complete");
export const trackResultat = (statut: string): void => track(`resultat:${statut}`);
export const trackSimulationAbandon = (lastStep: number): void =>
  track("simulation_abandon", lastStep);

// Émet un événement quand le traceur est activé, en portant l'identité
// pseudonymisée courante lue en session (cf. `initAnalytics` pour le cycle de vie).
function track(action: string, value?: number): void {
  if (!state.enabled) return;
  (window._paq ??= []).push(buildEvent(getIdentite(), action, value));
}
