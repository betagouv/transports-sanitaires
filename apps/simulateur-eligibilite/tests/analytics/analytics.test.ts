import { beforeEach, describe, expect, it } from "vitest";
import { CONTEXTE_VERSION, type Contexte } from "../../shared/contexte";
import { setSessionContexte } from "../../front/contexte/session";
import {
  buildEvent,
  initAnalytics,
  resolveConfig,
  trackResultat,
  trackSimulationStart,
  trackSimulationStep,
} from "../../front/analytics/analytics";

const ctx: Contexte = {
  etabRef: "eRef",
  serviceRef: "sRef",
  prescripteurRef: "pRef",
  v: CONTEXTE_VERSION,
};

const config = { enabled: true, url: "https://matomo.test/", siteId: "275" };

beforeEach(() => {
  window._paq = [];
  setSessionContexte(null);
});

describe("buildEvent", () => {
  it("porte le prescripteurRef en Nom d'événement", () => {
    expect(buildEvent(ctx, "simulation_start")).toEqual([
      "trackEvent",
      "simulateur",
      "simulation_start",
      "pRef",
    ]);
  });

  it("place la valeur après le Nom", () => {
    expect(buildEvent(ctx, "simulation_step", 2)).toEqual([
      "trackEvent",
      "simulateur",
      "simulation_step",
      "pRef",
      2,
    ]);
  });

  it("sans contexte : pas de Nom, valeur précédée d'un Nom vide", () => {
    expect(buildEvent(null, "simulation_start")).toEqual([
      "trackEvent",
      "simulateur",
      "simulation_start",
    ]);
    expect(buildEvent(null, "simulation_abandon", 3)).toEqual([
      "trackEvent",
      "simulateur",
      "simulation_abandon",
      "",
      3,
    ]);
  });
});

describe("resolveConfig", () => {
  it("désactivé hors prod et sans flag", () => {
    expect(resolveConfig({ PROD: false }).enabled).toBe(false);
  });

  it("activé en build de prod", () => {
    expect(resolveConfig({ PROD: true }).enabled).toBe(true);
  });

  it("activable en local via VITE_MATOMO_ENABLED", () => {
    expect(resolveConfig({ PROD: false, VITE_MATOMO_ENABLED: "true" }).enabled).toBe(
      true
    );
  });

  it("défauts beta.gouv, surchargeables", () => {
    expect(resolveConfig({ PROD: true })).toMatchObject({
      url: "https://stats.beta.gouv.fr/",
      siteId: "275",
    });
    expect(
      resolveConfig({ PROD: true, VITE_MATOMO_URL: "https://x/", VITE_MATOMO_SITE_ID: "9" })
    ).toMatchObject({ url: "https://x/", siteId: "9" });
  });
});

describe("initAnalytics + événements", () => {
  it("amorce le tracker quand activé, en cookieless", () => {
    initAnalytics(config);
    expect(window._paq).toContainEqual(["disableCookies"]);
    expect(window._paq).toContainEqual(["setTrackerUrl", "https://matomo.test/matomo.php"]);
    expect(window._paq).toContainEqual(["setSiteId", "275"]);
    expect(window._paq).toContainEqual(["trackPageView"]);
  });

  it("émet des événements portant le prescripteurRef de la session", () => {
    initAnalytics(config);
    setSessionContexte(ctx); // ctx connu après l'identification, avant les événements
    window._paq = []; // isole les événements des commandes d'amorçage
    trackSimulationStart();
    trackSimulationStep(3);
    trackResultat("Patient éligible");
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "simulation_start", "pRef"],
      ["trackEvent", "simulateur", "simulation_step", "pRef", 3],
      ["trackEvent", "simulateur", "resultat:Patient éligible", "pRef"],
    ]);
  });

  it("émet sans Nom si l'identification n'a pas fourni de ref", () => {
    initAnalytics(config);
    window._paq = [];
    trackSimulationStart();
    expect(window._paq).toEqual([["trackEvent", "simulateur", "simulation_start"]]);
  });

  it("est un no-op quand désactivé", () => {
    initAnalytics({ ...config, enabled: false });
    trackSimulationStart();
    expect(window._paq).toEqual([]);
  });
});
