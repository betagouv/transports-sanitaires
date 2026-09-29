import { beforeEach, describe, expect, it } from "vitest";
import { NomEvenement, trackEvenement } from "../../front/analytics/evenements";
import { initAnalytics } from "../../front/analytics/matomo";
import { rangerRattachement } from "../../front/rattachement/session";
import {
  type RattachementPseudonymise,
  VERSION,
} from "../../shared/rattachement-pseudonymise";

const rattachement: RattachementPseudonymise = {
  etabRef: "eRef",
  serviceRef: "sRef",
  v: VERSION,
};

beforeEach(() => {
  window._paq = [];
  rangerRattachement(null);
  initAnalytics({ enabled: true, url: "https://matomo.test/", siteId: "275" });
  window._paq = []; // isole les événements des commandes d'amorçage
});

describe("référentiel des évènements", () => {
  it("émet le nom fixe de l'évènement, avec le serviceRef de la session", () => {
    rangerRattachement(rattachement);
    trackEvenement(NomEvenement.prescripteur.simulationStart);
    trackEvenement(NomEvenement.prescripteur.simulationStep, 3);
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "prescripteur:simulation_start", "sRef"],
      ["trackEvent", "simulateur", "prescripteur:simulation_step", "sRef", 3],
    ]);
  });

  it("distingue les tunnels par outil, dans le nom lui-même", () => {
    trackEvenement(NomEvenement.prescripteur.simulationStart);
    trackEvenement(NomEvenement.secretariat.simulationStep, 1);
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "prescripteur:simulation_start"],
      ["trackEvent", "simulateur", "secretariat:simulation_step", "", 1],
    ]);
  });

  it("distingue chaque statut de résultat, secretariat comme prescripteur", () => {
    trackEvenement(NomEvenement.secretariat.resultat.prescription_s3141);
    trackEvenement(NomEvenement.secretariat.resultat.indetermine);
    trackEvenement(NomEvenement.prescripteur.resultat.vsl_ou_tpmr_ou_taxi_tpmr);
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "secretariat:resultat:prescription_s3141"],
      ["trackEvent", "simulateur", "secretariat:resultat:indetermine"],
      [
        "trackEvent",
        "simulateur",
        "prescripteur:resultat:vsl_ou_tpmr_ou_taxi_tpmr",
      ],
    ]);
  });

  it("le CERFA est attribué au secrétariat, et distingue les trois formulaires", () => {
    // Trois formulaires sortent du parcours : les compter ensemble ferait
    // perdre la seule chose qu'on cherche à voir.
    trackEvenement(
      NomEvenement.secretariat.cerfaTelecharge[
        "prescription-medicale-transport"
      ],
    );
    trackEvenement(
      NomEvenement.secretariat.cerfaTelecharge["demande-accord-prealable"],
    );
    trackEvenement(
      NomEvenement.secretariat.cerfaTelecharge[
        "prescription-permission-sortie"
      ],
    );
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
      [
        "trackEvent",
        "simulateur",
        "secretariat:cerfa_telecharge:prescription-permission-sortie",
      ],
    ]);
  });

  it("émet sans Nom si le rattachement n'a pas fourni de ref", () => {
    trackEvenement(NomEvenement.prescripteur.simulationStart);
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "prescripteur:simulation_start"],
    ]);
  });
});
