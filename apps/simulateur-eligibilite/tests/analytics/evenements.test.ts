import { beforeEach, describe, expect, it } from "vitest";
import {
  trackCerfaTelecharge,
  trackResultat,
  trackSimulationStart,
  trackSimulationStep,
} from "../../front/analytics/evenements";
import { initAnalytics } from "../../front/analytics/matomo";
import { rangerIdentite } from "../../front/identification/session";
import {
  type IdentitePseudonymisee,
  VERSION,
} from "../../shared/identite-pseudonymisee";

const identite: IdentitePseudonymisee = {
  etabRef: "eRef",
  serviceRef: "sRef",
  prescripteurRef: "pRef",
  v: VERSION,
};

beforeEach(() => {
  window._paq = [];
  rangerIdentite(null);
  initAnalytics({ enabled: true, url: "https://matomo.test/", siteId: "275" });
  window._paq = []; // isole les événements des commandes d'amorçage
});

describe("vocabulaire des événements", () => {
  it("émet les actions du parcours, avec le prescripteurRef de la session", () => {
    rangerIdentite(identite);
    trackSimulationStart();
    trackSimulationStep(3);
    trackResultat("Patient éligible");
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "simulation_start", "pRef"],
      ["trackEvent", "simulateur", "simulation_step", "pRef", 3],
      ["trackEvent", "simulateur", "resultat:Patient éligible", "pRef"],
    ]);
  });

  it("préfixe l'action par l'outil émetteur pour séparer les tunnels", () => {
    trackSimulationStart("prescripteur");
    trackSimulationStep(1, "secretariat");
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "prescripteur:simulation_start"],
      ["trackEvent", "simulateur", "secretariat:simulation_step", "", 1],
    ]);
  });

  it("le CERFA est attribué au secrétariat, et nomme le formulaire produit", () => {
    // Deux formulaires sortent du parcours : les compter ensemble ferait perdre
    // la seule chose qu'on cherche à voir.
    trackCerfaTelecharge("prescription-medicale-transport");
    trackCerfaTelecharge("demande-accord-prealable");
    expect(window._paq).toEqual([
      [
        "trackEvent",
        "simulateur",
        "secretariat:cerfa_telecharge:prescription-medicale-transport",
      ],
      [
        "trackEvent",
        "simulateur",
        "secretariat:cerfa_telecharge:demande-accord-prealable",
      ],
    ]);
  });

  it("émet sans Nom si l'identification n'a pas fourni de ref", () => {
    trackSimulationStart();
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "simulation_start"],
    ]);
  });
});
