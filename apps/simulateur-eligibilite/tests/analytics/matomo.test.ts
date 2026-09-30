import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

// L'app vit dans une iframe du CMS, qui tient l'opt-out : le traceur attend son
// choix avant de mesurer quoi que ce soit (voir choix-analytics.test.ts pour
// le pont lui-même).
describe("mesure selon le choix transmis par le CMS", () => {
  function pageParente() {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);
    const parent = iframe.contentWindow as Window;
    const choisir = (suivi: boolean) =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "statistiques-simulateur:choix", suivi },
          source: parent,
        }),
      );
    return { parent, choisir };
  }

  // Le chargeur de matomo.js est remplacé par un relevé des chargements
  // demandés : les tests ne touchent pas au réseau.
  let chargements: string[] = [];
  const demarrerDansLIframe = () => {
    const page = pageParente();
    chargements = [];
    initAnalytics(config, {
      parent: page.parent,
      delaiMs: 60_000,
      charger: (url) => chargements.push(url),
    });
    return page;
  };

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("attend le choix avant la moindre mesure", () => {
    demarrerDansLIframe();
    emettre("simulation_start");
    expect(window._paq).toEqual([]);
    expect(chargements).toEqual([]);
  });

  it("une fois le suivi accepté, amorce le traceur puis rejoue ce qui attendait", () => {
    const { choisir } = demarrerDansLIframe();
    emettre("simulation_start");
    choisir(true);

    expect(window._paq?.at(0)).toEqual(["disableCookies"]);
    expect(window._paq?.at(-2)).toEqual(["trackPageView"]);
    expect(window._paq?.at(-1)).toEqual([
      "trackEvent",
      "simulateur",
      "simulation_start",
    ]);
    expect(chargements).toEqual(["https://matomo.test/"]);
  });

  it("sur refus, ne charge pas Matomo et n'envoie rien", () => {
    const { choisir } = demarrerDansLIframe();
    emettre("simulation_start");
    choisir(false);
    emettre("simulation_step", 1);

    expect(window._paq).toEqual([]);
    expect(chargements).toEqual([]);
  });

  it("un refus en cours de session arrête la mesure", () => {
    const { choisir } = demarrerDansLIframe();
    choisir(true);
    window._paq = [];
    choisir(false);
    emettre("simulation_step", 1);

    expect(window._paq).toEqual([]);
  });

  it("une réactivation reprend la mesure", () => {
    const { choisir } = demarrerDansLIframe();
    choisir(true);
    choisir(false);
    window._paq = [];
    choisir(true);
    emettre("simulation_step", 1);

    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "simulation_step", "", 1],
    ]);
  });
});
