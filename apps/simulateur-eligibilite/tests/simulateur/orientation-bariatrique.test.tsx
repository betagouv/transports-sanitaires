// L'orientation donnée au patient dont la contrainte bariatrique est le seul
// motif : l'Assurance Maladie ne prend rien en charge, mais le besoin d'un
// véhicule adapté demeure entier. La v9.4 nomme l'interlocuteur —
// l'établissement, ou la coordination territoriale compétente.
//
// Sans elle, les deux écrans du cas « bariatrique seul » se refermaient sur un
// refus et rien d'autre. Le contrat d'interface la porte aux deux endroits ; ce
// fichier tient qu'elle y est, et qu'elle ne déborde pas ailleurs : le patient
// dont la contrainte bariatrique **accompagne** un besoin médical est, lui, pris
// en charge, et n'a personne à contacter — on lui dit seulement que son véhicule
// devra être équipé.

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { BASE_NEUTRE } from "../../front/outils-produit/seeds/base-neutre";
import { emettrePassation } from "../../front/simulateur/passation";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { terminerParcours } from "./parcours";

beforeEach(() => sessionStorage.clear());

const ORIENTATION =
  /contactez l’établissement ou la coordination territoriale compétente afin d’organiser un véhicule disposant de l’équipement adapté/i;

const CASE_BARIATRIQUE = /équipement bariatrique adapté/i;

// Bariatrique **seul** — aucun autre besoin médical, donc aucun droit ouvert.
const BARIATRIQUE_SEUL = {
  ...BASE_NEUTRE,
  p1_m0_bariatrique: "oui",
  p1_m0_aucun: "non",
};

// La même contrainte, mais accompagnée d'un besoin d'ambulance : le transport est
// prescrit, et l'orientation n'a plus lieu d'être.
const BARIATRIQUE_AVEC_AMBULANCE = {
  ...BARIATRIQUE_SEUL,
  p1_autonomie:
    "'Nécessite une prise en charge spécifique pendant le trajet ou l’aide d’un professionnel pour se déplacer ou accomplir les formalités liées au transport.'",
  p1_critere_oxygene: "oui",
  p2_contexte_hospitalisation: "oui",
  p2_contexte_aucun: "non",
};

describe("contrainte bariatrique seule — vers qui se tourner", () => {
  it("Page Résultat 1 : le prescripteur lit l’orientation avec le refus", async () => {
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />,
    );
    await terminerParcours(userEvent.setup(), [[CASE_BARIATRIQUE]]);

    expect(
      screen.getByRole("heading", {
        name: /aucun transport prescriptible sur le seul fondement bariatrique/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(ORIENTATION)).toBeInTheDocument();
  });

  it("Page Résultat 2 : le document remis au patient la porte aussi", () => {
    emettrePassation(BARIATRIQUE_SEUL);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    expect(
      screen.getByRole("heading", {
        name: /au titre du seul motif « bariatrique »/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(ORIENTATION)).toBeInTheDocument();
  });

  it("ne l’adresse pas au patient dont le transport est prescrit", () => {
    emettrePassation(BARIATRIQUE_AVEC_AMBULANCE);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    expect(screen.queryByText(ORIENTATION)).toBeNull();
  });
});
