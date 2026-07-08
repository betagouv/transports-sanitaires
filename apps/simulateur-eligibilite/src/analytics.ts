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
//   - le contexte prescripteur est lu depuis la session (#ctx) au démarrage.

import { getSessionCtx } from "./session";
import type { Ctx } from "./ctx";

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
  ctx: Ctx | null,
  action: string,
  value?: number
): unknown[] {
  const event: unknown[] = ["trackEvent", CATEGORY, action];
  const name = ctx?.prescripteurRef;
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

let state: { enabled: boolean; ctx: Ctx | null } = { enabled: false, ctx: null };

/**
 * Configure le traceur : enregistre le contexte prescripteur et, si activé,
 * empile les commandes d'amorçage dans `_paq` (avant le chargement de matomo.js,
 * qui traitera la file). N'injecte **pas** le script tiers — c'est le rôle de
 * `loadMatomo`, appelé séparément (garde les tests sans effet de bord réseau).
 */
export function initAnalytics(
  config: AnalyticsConfig,
  ctx: Ctx | null = getSessionCtx()
): void {
  state = { enabled: config.enabled, ctx };
  if (!config.enabled) return;

  const paq = (window._paq ??= []);
  paq.push(["setTrackerUrl", config.url + "matomo.php"]);
  paq.push(["setSiteId", config.siteId]);
  paq.push(["enableLinkTracking"]);
  paq.push(["trackPageView"]);
}

/** Injecte le script matomo.js (idempotent). */
export function loadMatomo(url: string): void {
  if (document.getElementById("matomo-js")) return;
  const g = document.createElement("script");
  g.id = "matomo-js";
  g.async = true;
  g.src = url + "matomo.js";
  document.head.appendChild(g);
}

function track(action: string, value?: number): void {
  if (!state.enabled) return;
  (window._paq ??= []).push(buildEvent(state.ctx, action, value));
}

export const trackSimulationStart = (): void => track("simulation_start");
export const trackSimulationStep = (stepIndex: number): void =>
  track("simulation_step", stepIndex);
export const trackSimulationComplete = (): void => track("simulation_complete");
export const trackResultat = (statut: string): void => track(`resultat:${statut}`);
export const trackSimulationAbandon = (lastStep: number): void =>
  track("simulation_abandon", lastStep);
