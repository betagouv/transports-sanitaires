import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../../front/app/App";
import { snapshotReferentiel } from "../../shared/referentiel";
import { sIdentifier, sIdentifierProduit } from "../porte";
import { terminerParcours } from "../simulateur/parcours";

// La trace de debug est un outil produit comme la galerie et le labo : elle
// s'ouvre sur **tous** les environnements, production comprise, et pour le seul
// service n° 4. Elle montre le chemin parcouru et les réponses déjà saisies, ce
// qu'aucun prescripteur ordinaire n'a à voir sous ses questions.
//
// Les tests passent par `App`, et non par le simulateur : c'est le câblage
// qu'ils gardent, du service choisi à la porte jusqu'au `traceDebug` des écrans.

const TRACE_PARCOURS = /^Debug — chemin parcouru/;
const TRACE_RESULTAT = /^Debug — résultat médical/;

beforeEach(() => sessionStorage.clear());

function afficher() {
  render(
    <App referentiel={snapshotReferentiel} pseudonymiser={async () => null} />,
  );
  return userEvent.setup({ delay: null });
}

describe("trace de debug du parcours", () => {
  it("s'ouvre sous le questionnaire après une identification service n° 4", async () => {
    const user = afficher();

    await sIdentifierProduit(user);

    expect(await screen.findByText(TRACE_PARCOURS)).toBeInTheDocument();
  });

  it("reste fermée après une identification ordinaire", async () => {
    const user = afficher();

    await sIdentifier(user);

    await screen.findByRole("group", {
      name: /^concernant son déplacement, le patient/i,
    });
    expect(screen.queryByText(TRACE_PARCOURS)).toBeNull();
  });

  it("porte les réponses déjà saisies, sous la règle qui les a reçues", async () => {
    const user = afficher();
    await sIdentifierProduit(user);

    await screen.findByText(TRACE_PARCOURS);
    await user.click(
      await screen.findByRole("radio", { name: /^peut se déplacer seul/i }),
    );

    // La valeur telle que la situation la porte, entre guillemets publicodes :
    // ce libellé-là n'est nulle part ailleurs sur la page, la question ayant
    // avancé d'elle-même.
    const valeur = await screen.findByText(/^"'Peut se déplacer seul/);
    expect(valeur.closest("li")).toHaveTextContent("p1_autonomie");
  });
});

describe("trace de debug du résultat médical", () => {
  it("s'ouvre sous le résultat après une identification service n° 4", async () => {
    const user = afficher();
    await sIdentifierProduit(user);

    await terminerParcours(user, []);

    expect(await screen.findByText(TRACE_RESULTAT)).toBeInTheDocument();
  });

  it("reste fermée après une identification ordinaire", async () => {
    const user = afficher();
    await sIdentifier(user);

    await terminerParcours(user, []);

    await screen.findByRole("heading", { name: /décision médicale/i });
    expect(screen.queryByText(TRACE_RESULTAT)).toBeNull();
  });
});
