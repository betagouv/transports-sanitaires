import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { terminerParcours } from "./parcours";

beforeEach(() => sessionStorage.clear());

const SMUR = /équipe SMUR/i;
const BARIATRIQUE = /équipement bariatrique adapté/i;
const AIDES = /aides ou conditions particulières/i;

function afficher(onPasserAuSecretariat = () => {}) {
  render(
    <Prescripteur
      onPasserAuSecretariat={onPasserAuSecretariat}
      onNouvelleSimulation={() => {}}
    />,
  );
  return userEvent.setup();
}

describe("prescripteur — résultat médical", () => {
  it("SMUR → cas tranché en Partie 1, la main passe au résultat final", async () => {
    const passer = vi.fn();
    const user = afficher(passer);

    await terminerParcours(user, [[SMUR]]);

    expect(
      screen.getByRole("heading", { name: /transport par une équipe SMUR/i }),
    ).toBeInTheDocument();

    // Cas tranché dès la Partie 1 : le CTA mène directement au résultat final.
    await user.click(
      screen.getByRole("button", { name: /voir le résultat final/i }),
    );
    expect(passer).toHaveBeenCalledTimes(1);
  });

  it("contrainte bariatrique seule → aucun transport prescriptible", async () => {
    const user = afficher();

    await terminerParcours(user, [[BARIATRIQUE]]);

    expect(
      screen.getByRole("heading", {
        name: /aucun transport prescriptible sur le seul fondement bariatrique/i,
      }),
    ).toBeInTheDocument();
  });

  it("décision établie : le bloc patient liste critères et cas particuliers retenus", async () => {
    const user = afficher();

    // Q1 : besoin d'un professionnel → Q1.1 est posée. Choix unique : la page
    // avance d'elle-même, sans bouton.
    await user.click(
      within(screen.getByRole("group", { name: /^le patient/i })).getByRole(
        "radio",
        { name: /prise en charge spécifique/i },
      ),
    );
    const aides = await screen.findByRole("group", { name: AIDES });

    // Q1.1 : un critère d'ambulance → attendu dans les critères retenus.
    await user.click(
      within(aides).getByRole("checkbox", {
        name: /administration d’oxygène/i,
      }),
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // M0 : une séance → attendue dans les cas particuliers médicaux.
    await user.click(
      screen.getByRole("checkbox", { name: /séance de dialyse/i }),
    );
    await user.click(screen.getByRole("button", { name: /^voir/i }));

    expect(
      screen.getByRole("heading", { name: /information destinée au patient/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /critères médicaux retenus/i }),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/administration d’oxygène/i).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole("heading", {
        name: /cas particuliers médicaux retenus/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/séance de soins répétée ou spécialisée/i),
    ).toBeInTheDocument();
  });

  it("cas tranché : le bloc patient explique les deux conditions manquantes", async () => {
    const user = afficher();

    await terminerParcours(user, [[BARIATRIQUE]]);

    expect(
      screen.getByRole("heading", { name: /information destinée au patient/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/deux éléments doivent être réunis/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/une situation ouvrant droit à la prise en charge/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/un besoin médical de transport adapté/i),
    ).toBeInTheDocument();
    // Aucune section « critères retenus » quand la Partie 1 a tranché.
    expect(
      screen.queryByRole("heading", { name: /critères médicaux retenus/i }),
    ).toBeNull();
  });

  // Le verrou de la décision médicale ne s'annonce pas : l'écran nomme l'action
  // à venir, il ne décrit pas ce qu'elle rendra impossible. La phrase était
  // affichée sous les boutons du cas courant — précisément celui que ce test
  // atteint, seul endroit où elle a jamais pu apparaître.
  it("n’annonce pas que la décision sera figée", async () => {
    const user = afficher();

    await terminerParcours(user, [
      [/^le patient/i, /prise en charge spécifique/i],
      [/administration d’oxygène/i],
    ]);

    expect(
      screen.getByRole("button", {
        name: /compléter la partie administrative/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/figée/i)).toBeNull();
    expect(screen.queryByText(/ne pourra plus être modifiée/i)).toBeNull();
  });
});
