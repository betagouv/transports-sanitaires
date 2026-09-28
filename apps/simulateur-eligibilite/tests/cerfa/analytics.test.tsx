import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Situation } from "publicodes";
import { beforeEach, describe, expect, it } from "vitest";
import { initAnalytics } from "../../front/analytics/matomo";
import { BoutonCerfa } from "../../front/outils-produit/beta/cerfa/BoutonCerfa";
import type { DocumentCerfa } from "../../front/outils-produit/beta/cerfa/document";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { moteur } from "../../front/simulateur/moteur";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { GABARIT } from "./gabarit";

// Le gabarit réel, lu sur disque : en test il n'y a pas de serveur pour le
// `fetch` de l'asset.
const chargerGabarit = async (_document: DocumentCerfa) =>
  GABARIT.buffer.slice(0) as ArrayBuffer;

const documentTelechargeable = (situation: Situation<string>) => (
  <BoutonCerfa
    moteur={moteur}
    situation={situation}
    chargerGabarit={chargerGabarit}
  />
);

/** Situation complète menant à une prescription médicale de transport. */
const PRESCRIPTION: Situation<string> = {
  ...BASE_NEUTRE,
  p1_autonomie:
    "'Nécessite une prise en charge spécifique pendant le trajet, une aide d’un professionnel pour se déplacer ou, en l’absence d’un proche accompagnant, pour transmettre les informations nécessaires à l’équipe soignante.'",
  p1_critere_position_allongee_demi_assise: "oui",
  p1_critere_brancardage_portage: "oui",
  p1_critere_aucun: "non",
  p2_raison_principale: "'Entrée en hospitalisation'",
  p2_organisation_transports: "'aller-retour identique'",
  p2_nombre_transports_prevus: "2",
};

beforeEach(() => {
  window._paq = [];
  initAnalytics({ enabled: true, url: "https://matomo.test/", siteId: "275" });
  window._paq = []; // isole les événements des commandes d'amorçage
});

describe("BoutonCerfa — analytics", () => {
  it("émet le bon évènement, nommé d'après le formulaire, au téléchargement", async () => {
    const user = userEvent.setup();
    render(
      <Secretariat
        onNouvelleSimulation={() => {}}
        situationFinale={PRESCRIPTION}
        documentTelechargeable={documentTelechargeable}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: /Télécharger la prescription pré-remplie/i,
      }),
    );
    // Timeout élargi : charger puis réécrire un gabarit de 767 ko dépasse la
    // seconde par défaut quand la suite tourne en parallèle (cf.
    // Telechargement.test.tsx).
    await waitFor(
      () =>
        expect(window._paq).toContainEqual([
          "trackEvent",
          "simulateur",
          "secretariat:cerfa_telecharge:prescription-medicale-transport",
        ]),
      { timeout: 10_000 },
    );
  });
});
