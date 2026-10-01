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
    trackEvenement(NomEvenement.prescripteur.simulationStart);
    trackEvenement(NomEvenement.prescripteur.simulationStep, 3);
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "prescripteur:simulation_start", "42"],
      ["trackEvent", "simulateur", "prescripteur:simulation_step", "42", 3],
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

  it("émet sans Nom tant que personne ne s'est rattaché", () => {
    trackEvenement(NomEvenement.prescripteur.simulationStart);
    expect(window._paq).toEqual([
      ["trackEvent", "simulateur", "prescripteur:simulation_start"],
    ]);
  });
});
