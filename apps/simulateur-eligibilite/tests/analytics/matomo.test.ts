import { beforeEach, describe, expect, it } from "vitest";
import {
  configDepuisEnv,
  construireEvenement,
  emettre,
  initAnalytics,
} from "../../front/analytics/matomo";
import { rangerRattachement } from "../../front/rattachement/session";
import type { RattachementSaisi } from "../../shared/rattachement-saisi";

const rattachement: RattachementSaisi = { etabId: "7", serviceId: "42" };

const config = { enabled: true, url: "https://matomo.test/", siteId: "275" };

beforeEach(() => {
  window._paq = [];
  rangerRattachement(null);
});

describe("construireEvenement", () => {
  it("porte l'id du service en Nom d'événement", () => {
    expect(construireEvenement(rattachement, "simulation_start")).toEqual([
      "trackEvent",
      "simulateur",
      "simulation_start",
      "42",
    ]);
  });

  it("place la valeur après le Nom", () => {
    expect(construireEvenement(rattachement, "simulation_step", 2)).toEqual([
      "trackEvent",
      "simulateur",
      "simulation_step",
      "42",
      2,
    ]);
  });

  it("service saisi sous « Autre » : le Nom reste l'id de l'entrée « Autre »", () => {
    // Le service libre ne part jamais : il n'est connu que de Grist, qui en fait
    // un vrai service pour la visite suivante.
    const autre: RattachementSaisi = {
      etabId: "7",
      serviceId: "99",
      serviceEstAutre: true,
      serviceLibre: "Néphrologie",
    };
    expect(construireEvenement(autre, "simulation_start")).toEqual([
      "trackEvent",
      "simulateur",
      "simulation_start",
      "99",
    ]);
  });

  it("sans rattachement : pas de Nom, valeur précédée d'un Nom vide", () => {
    expect(construireEvenement(null, "simulation_start")).toEqual([
      "trackEvent",
      "simulateur",
      "simulation_start",
    ]);
    expect(construireEvenement(null, "simulation_abandon", 3)).toEqual([
      "trackEvent",
      "simulateur",
      "simulation_abandon",
      "",
      3,
    ]);
  });
});

describe("configDepuisEnv", () => {
  it("désactivé hors prod et sans flag", () => {
    expect(configDepuisEnv({ PROD: false }).enabled).toBe(false);
  });

  it("activé en build de prod", () => {
    expect(configDepuisEnv({ PROD: true }).enabled).toBe(true);
  });

  it("activable en local via VITE_MATOMO_ENABLED", () => {
    expect(
      configDepuisEnv({ PROD: false, VITE_MATOMO_ENABLED: "true" }).enabled,
    ).toBe(true);
  });

  it("défauts beta.gouv, surchargeables", () => {
    expect(configDepuisEnv({ PROD: true })).toMatchObject({
      url: "https://stats.beta.gouv.fr/",
      siteId: "275",
    });
    expect(
      configDepuisEnv({
        PROD: true,
        VITE_MATOMO_URL: "https://x/",
        VITE_MATOMO_SITE_ID: "9",
      }),
    ).toMatchObject({ url: "https://x/", siteId: "9" });
  });
});

describe("initAnalytics", () => {
  it("amorce le tracker quand activé, en cookieless", () => {
    initAnalytics(config);
    expect(window._paq).toContainEqual(["disableCookies"]);
    expect(window._paq).toContainEqual([
      "setTrackerUrl",
      "https://matomo.test/matomo.php",
    ]);
    expect(window._paq).toContainEqual(["setSiteId", "275"]);
    expect(window._paq).toContainEqual(["trackPageView"]);
  });

  it("émet en portant le service rattaché en session", () => {
    initAnalytics(config);
    rangerRattachement(rattachement); // connu après le rattachement, avant les événements
    window._paq = []; // isole les événements des commandes d'amorçage
    emettre("simulation_start");
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "simulation_start", "42"],
    ]);
  });

  it("est un no-op quand désactivé", () => {
    initAnalytics({ ...config, enabled: false });
    emettre("simulation_start");
    expect(window._paq).toEqual([]);
  });
});
