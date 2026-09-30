// Le transport des événements vers Matomo : amorçage du tag, injection du script
// et mise en forme d'un `trackEvent`. Le vocabulaire mesuré, lui, est dans
// `evenements.ts`. Ce fichier ne sait pas ce que le produit compte.

import type { RattachementSaisi } from "../../shared/rattachement-saisi";
import { rattachementEnSession } from "../rattachement/session";
import {
  type ChoixStatistiques,
  type OptionsDuPont,
  suivreChoixStatistiques,
} from "./choix-statistiques";

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
 * build de prod, ou avec `VITE_MATOMO_ENABLED=true` pour tester en local. Il ne
 * demande aucun consentement : la mesure, agrégée par service, reste dans
 * l'exemption CNIL (ADR-3 d'analytics.md).
 */
export function configDepuisEnv(env: Env = import.meta.env): AnalyticsConfig {
  return {
    enabled: env.PROD === true || env.VITE_MATOMO_ENABLED === "true",
    url: env.VITE_MATOMO_URL || DEFAULT_URL,
    siteId: env.VITE_MATOMO_SITE_ID || DEFAULT_SITE_ID,
  };
}

export type OptionsDuTraceur = OptionsDuPont & {
  /**
   * Charge le script tiers au premier suivi. Rien par défaut : `Main.tsx` passe
   * `chargerMatomo`, ce qui garde les tests sans effet de bord réseau.
   */
  charger?: (url: string) => void;
};

/**
 * Configure le traceur, appelé au boot. S'il est activé, il attend le choix de
 * l'utilisateur, que le CMS tient (voir `choix-statistiques.ts`) : rien n'est
 * mesuré ni chargé avant. Au suivi, il amorce `_paq` et charge matomo.js ; au
 * refus, il ne charge rien.
 *
 * Le service n'est pas connu ici : il est lu en session au moment d'émettre
 * chaque événement, voir `emettre`.
 */
export function initAnalytics(
  config: AnalyticsConfig,
  { charger = () => {}, ...pont }: OptionsDuTraceur = {},
): void {
  const courant: Etat = { config, charger, choix: "en-attente", enAttente: [] };
  etat = courant;
  if (!config.enabled) return;
  suivreChoixStatistiques((choix) => {
    if (etat === courant) appliquer(courant, choix);
  }, pont);
}

/** Injecte le script matomo.js, qui traitera la file. Idempotent. */
export function chargerMatomo(url: string): void {
  if (document.getElementById("matomo-js")) return;
  const script = document.createElement("script");
  script.id = "matomo-js";
  script.async = true;
  script.src = `${url}matomo.js`;
  document.head.appendChild(script);
}

/**
 * Émet un événement quand le traceur est activé et que l'utilisateur n'a pas
 * refusé, en portant le service rattaché, lu en session. Tant que le choix n'est
 * pas connu, l'événement attend. Voir `initAnalytics` pour le cycle de vie.
 */
export function emettre(action: string, valeur?: number): void {
  if (!etat.config.enabled || etat.choix === "refus") return;
  const evenement = construireEvenement(
    rattachementEnSession(),
    action,
    valeur,
  );
  if (etat.choix === "en-attente") etat.enAttente.push(evenement);
  else filePaq().push(evenement);
}

/**
 * Construit un événement Matomo `trackEvent` : une catégorie constante, l'action,
 * puis l'id Grist du service en Nom s'il existe, et une valeur numérique
 * optionnelle. Le service libre saisi sous « Autre » ne part jamais : le Nom reste
 * l'id de l'entrée « Autre ».
 *
 * L'instance mutualisée beta.gouv n'offre pas de custom dimension, c'est le risque
 * R-8. Le service est donc porté en propriété d'événement, faute de mieux. La
 * fonction est exportée pour les tests.
 */
export function construireEvenement(
  rattachement: RattachementSaisi | null,
  action: string,
  valeur?: number,
): unknown[] {
  const evenement: unknown[] = ["trackEvent", CATEGORY, action];
  const nom = rattachement?.serviceId;
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

type Etat = {
  config: AnalyticsConfig;
  charger: (url: string) => void;
  choix: ChoixStatistiques | "en-attente";
  // Les événements émis avant le choix, rejoués au suivi.
  enAttente: unknown[][];
  // Le traceur a été amorcé, et matomo.js chargé.
  amorce?: boolean;
};

let etat: Etat = {
  config: { enabled: false, url: DEFAULT_URL, siteId: DEFAULT_SITE_ID },
  charger: () => {},
  choix: "en-attente",
  enAttente: [],
};

// Au premier suivi, amorce le traceur ; à chaque suivi, rejoue ce qui attendait.
// Un refus jette l'attente, et `emettre` n'émet plus rien : matomo.js ne mesure
// rien de lui-même (ni liens sortants, ni téléchargements), ce blocage suffit.
function appliquer(courant: Etat, choix: ChoixStatistiques) {
  const attente = courant.enAttente;
  courant.enAttente = [];
  courant.choix = choix;
  if (choix === "refus") return;
  if (!courant.amorce) amorcer(courant);
  const paq = filePaq();
  for (const evenement of attente) paq.push(evenement);
}

// Le traceur est cookieless (`disableCookies`), parce que l'app tourne dans
// l'iframe du CMS, un contexte tiers où les cookies sont bloqués, et parce que la
// mesure d'audience se veut sans bandeau. L'IP, elle, s'anonymise côté instance
// Matomo, pas ici : l'API JS n'a pas de commande pour ça.
function amorcer(courant: Etat) {
  const { url, siteId } = courant.config;
  const paq = filePaq();
  paq.push(["disableCookies"]);
  paq.push(["setTrackerUrl", `${url}matomo.php`]);
  paq.push(["setSiteId", siteId]);
  paq.push(["trackPageView"]);
  courant.charger(url);
  courant.amorce = true;
}
