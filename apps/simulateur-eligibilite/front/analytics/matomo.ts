// Le transport des événements vers Matomo : amorçage du tag, injection du script
// et mise en forme d'un `trackEvent`. Le vocabulaire mesuré, lui, est dans
// `evenements.ts`. Ce fichier ne sait pas ce que le produit compte.

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
 * Résout la configuration depuis l'environnement. Le traceur n'est activé qu'en
 * build de prod, ou avec `VITE_MATOMO_ENABLED=true` pour tester en local, et
 * seulement si le consentement est accordé. En phase expérimentale, l'ADR-3 le
 * donne par défaut et sans bandeau ; c'est ici le point de décision isolé où
 * brancher un vrai bandeau.
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
 * Configure le traceur. S'il est activé, on empile les commandes d'amorçage dans
 * `_paq`, avant le chargement de matomo.js qui traitera la file. La fonction est
 * appelée au boot, avant l'identification : l'identité prescripteur n'est pas
 * connue ici, elle est lue en session au moment d'émettre chaque événement, voir
 * `emettre`. Elle n'injecte pas le script tiers, c'est le rôle de `chargerMatomo`,
 * appelé séparément, ce qui garde les tests sans effet de bord réseau.
 *
 * Le traceur est cookieless (`disableCookies`), parce que l'app tourne dans
 * l'iframe du CMS, un contexte tiers où les cookies sont bloqués, et parce que la
 * mesure d'audience se veut sans bandeau.
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

/** Injecte le script matomo.js. Idempotent. */
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
 * pseudonymisée courante, lue en session. Voir `initAnalytics` pour le cycle de vie.
 */
export function emettre(action: string, valeur?: number): void {
  if (!etat.enabled) return;
  filePaq().push(construireEvenement(identiteEnSession(), action, valeur));
}

/**
 * Construit un événement Matomo `trackEvent` : une catégorie constante, l'action,
 * puis le `prescripteurRef` en Nom s'il existe, et une valeur numérique
 * optionnelle.
 *
 * L'instance mutualisée beta.gouv n'offre pas de custom dimension, c'est le risque
 * R-8. Le `prescripteurRef` pseudonymisé, décrit par l'ADR-4 d'identification.md,
 * est donc porté en propriété d'événement, faute de mieux. La fonction est exportée
 * pour les tests.
 */
export function construireEvenement(
  identite: IdentitePseudonymisee | null,
  action: string,
  valeur?: number,
): unknown[] {
  const evenement: unknown[] = ["trackEvent", CATEGORY, action];
  const nom = identite?.prescripteurRef;
  if (nom !== undefined) evenement.push(nom);
  if (valeur !== undefined) {
    if (nom === undefined) evenement.push(""); // Matomo : le Nom précède la Valeur
    evenement.push(valeur);
  }
  return evenement;
}

// ---- implémentation ----

type Env = {
  PROD?: boolean;
  VITE_MATOMO_ENABLED?: string;
  VITE_MATOMO_URL?: string;
  VITE_MATOMO_SITE_ID?: string;
};

let etat: { enabled: boolean } = { enabled: false };

// Unique point de création de la file. Le tag la remplace par un objet actif quand
// matomo.js se charge, et tout ce qui a été empilé avant est rejoué.
function filePaq(): unknown[][] {
  window._paq ??= [];
  return window._paq;
}

const CATEGORY = "simulateur";
// Instance mutualisée beta.gouv, site 275. L'intégration passe par le tag de
// suivi, `_paq` et matomo.js, et non par le Tag Manager.
const DEFAULT_URL = "https://stats.beta.gouv.fr/";
const DEFAULT_SITE_ID = "275";
