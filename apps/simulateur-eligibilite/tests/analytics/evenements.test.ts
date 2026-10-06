import { beforeEach, describe, expect, it } from "vitest";
import { NomEvenement, trackEvenement } from "../../front/analytics/evenements";
import { initAnalytics } from "../../front/analytics/matomo";
import { rangerRattachement } from "../../front/rattachement/session";
import type { RattachementSaisi } from "../../shared/rattachement-saisi";

const rattachement: RattachementSaisi = { etabId: "7", serviceId: "42" };

beforeEach(() => {
  window._paq = [];
  rangerRattachement(null);
  initAnalytics({ enabled: true, url: "https://matomo.test/", siteId: "275" });
  window._paq = []; // isole les événements des commandes d'amorçage
});

describe("référentiel des évènements", () => {
  it("émet le nom fixe de l'évènement, avec le service de la session", () => {
    rangerRattachement(rattachement);
    trackEvenement(NomEvenement.simulationStart);
    trackEvenement(NomEvenement.simulationStep, 3);
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "simulation_start", "42"],
      ["trackEvent", "simulateur", "simulation_step", "42", 3],
    ]);
  });

  it("émet sans Nom tant que personne ne s'est rattaché", () => {
    trackEvenement(NomEvenement.simulationStart);
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "simulation_start"],
    ]);
  });
});
