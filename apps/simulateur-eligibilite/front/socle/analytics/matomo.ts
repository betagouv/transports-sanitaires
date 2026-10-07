// L'envoi des évènements à Matomo : démarrage du tag, chargement du script, mise
// en forme d'un `trackEvent`. La liste des évènements est dans `evenements.ts`.

import type { RattachementSaisi } from "../../../shared/rattachement-saisi";
import { rattachementEnSession } from "../rattachement/session";
import {
  type BridgeOptions,
  type ChoixAnalytics,
  suivreChoixAnalytics,
} from "./choix-analytics";

declare global {
  interface Window {
    // La file d'attente du tag Matomo. Ce qu'on y empile avant le chargement de
    // matomo.js est rejoué par le script.
    _paq?: unknown[][];
  }
}

export type AnalyticsConfig = {
  enabled: boolean;
  url: string;
  siteId: string;
};

/**
 * Lit la configuration dans l'environnement. Le traceur n'est activé qu'en
 * build de prod, ou avec `VITE_MATOMO_ENABLED=true` pour tester en local. Il ne
 * demande pas de consentement : la mesure, agrégée par service, reste dans
 * l'exemption CNIL (ADR-3 d'analytics.md).
 */
export function configDepuisEnv(env: Env = import.meta.env): AnalyticsConfig {
  return {
    enabled: env.PROD === true || env.VITE_MATOMO_ENABLED === "true",
    url: env.VITE_MATOMO_URL || DEFAULT_URL,
    siteId: env.VITE_MATOMO_SITE_ID || DEFAULT_SITE_ID,
  };
}

export type TrackerOptions = BridgeOptions & {
  /**
   * Charge le script tiers au premier suivi. Rien par défaut : `Main.tsx` passe
   * `chargerMatomo`, et les tests restent sans réseau.
   */
  charger?: (url: string) => void;
};

/**
 * Configure le traceur, au démarrage. S'il est activé, il attend le choix de
 * l'utilisateur, que le CMS tient (voir `choix-analytics.ts`). Rien n'est
 * mesuré ni chargé avant. Au suivi, il amorce `_paq` et charge matomo.js. Au
 * refus, il ne charge rien.
 *
 * Le service n'est pas connu ici. Il est lu en session à chaque événement,
 * voir `emettre`.
 */
export function initAnalytics(
  config: AnalyticsConfig,
  { charger = () => {}, ...bridge }: TrackerOptions = {},
): void {
  const courant: Etat = { config, charger, choix: "en-attente", enAttente: [] };
  etat = courant;
  if (!config.enabled) return;
  suivreChoixAnalytics((choix) => {
    if (etat === courant) appliquer(courant, choix);
  }, bridge);
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
 * Émet un événement si le traceur est activé et si l'utilisateur n'a pas
 * refusé. L'événement porte le service rattaché, lu en session. Tant que le
 * choix n'est pas connu, il attend.
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
 * Construit un `trackEvent` Matomo : une catégorie constante, l'action, puis
 * l'id Grist du service en Nom s'il existe, et une valeur numérique optionnelle.
 * Le service libre saisi sous « Autre » ne part jamais : le Nom reste l'id de
 * l'entrée « Autre ».
 *
 * L'instance mutualisée beta.gouv n'offre pas de custom dimension (risque R-8).
 * Le service est donc porté par l'événement. Exportée pour les tests.
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

// Le seul endroit qui crée la file. Quand matomo.js se charge, le tag la
// remplace par un objet actif et rejoue ce qui était empilé.
function filePaq(): unknown[][] {
  window._paq ??= [];
  return window._paq;
}

const CATEGORY = "simulateur";
// Instance mutualisée beta.gouv, site 275. On passe par le tag de suivi (`_paq`
// et matomo.js), pas par le Tag Manager.
const DEFAULT_URL = "https://stats.beta.gouv.fr/";
const DEFAULT_SITE_ID = "275";

type Etat = {
  config: AnalyticsConfig;
  charger: (url: string) => void;
  choix: ChoixAnalytics | "en-attente";
  // Les événements émis avant le choix, rejoués au suivi.
  enAttente: unknown[][];
  // Le traceur a été amorcé, et matomo.js chargé.
  bootstrapped?: boolean;
};

let etat: Etat = {
  config: { enabled: false, url: DEFAULT_URL, siteId: DEFAULT_SITE_ID },
  charger: () => {},
  choix: "en-attente",
  enAttente: [],
};

// Au premier suivi, amorce le traceur. À chaque suivi, rejoue ce qui attendait.
// Un refus jette l'attente, et `emettre` n'émet plus rien. Cela suffit :
// matomo.js ne mesure rien de lui-même.
function appliquer(courant: Etat, choix: ChoixAnalytics) {
  const attente = courant.enAttente;
  courant.enAttente = [];
  courant.choix = choix;
  if (choix === "refus") return;
  if (!courant.bootstrapped) bootstrap(courant);
  const paq = filePaq();
  for (const evenement of attente) paq.push(evenement);
}

// Le traceur est sans cookie (`disableCookies`). L'app tourne dans l'iframe du
// CMS, un contexte tiers où les cookies sont bloqués, et la mesure se veut sans
// bandeau. L'IP s'anonymise côté instance Matomo : l'API JS ne le permet pas.
function bootstrap(courant: Etat) {
  const { url, siteId } = courant.config;
  const paq = filePaq();
  paq.push(["disableCookies"]);
  paq.push(["setTrackerUrl", `${url}matomo.php`]);
  paq.push(["setSiteId", siteId]);
  paq.push(["trackPageView"]);
  courant.charger(url);
  courant.bootstrapped = true;
}
