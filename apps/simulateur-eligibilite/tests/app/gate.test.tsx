import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../front/app/App";
import { snapshotReferentiel } from "../../shared/referentiel";

// La porte : impossible d'atteindre le simulateur sans s'être identifié. On
// injecte le référentiel snapshot et une résolution de contexte factice (pas de
// backend en test).
function setup() {
  const user = userEvent.setup();
  render(<App referentiel={snapshotReferentiel} resoudreContexte={async () => null} />);
  return { user };
}

async function choisir(labelSelect: RegExp, optionLabel: string) {
  const select = screen.getByRole("combobox", { name: labelSelect });
  await screen.findByRole("option", { name: optionLabel });
  await userEvent.selectOptions(select, optionLabel);
}

describe("écran-porte d'identification", () => {
  it("affiche l'identification d'abord, pas le formulaire", () => {
    setup();
    // Pas de titre (app en iframe) : l'écran d'identification se reconnaît à son
    // premier champ, et le formulaire du simulateur est absent.
    expect(
      screen.getByRole("combobox", { name: /Établissement/ })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: /situations suivantes/i })
    ).toBeNull();
  });

  it("passe au simulateur une fois le prescripteur validé", async () => {
    const { user } = setup();

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Service/, "Cardiologie");
    await user.click(screen.getByRole("button", { name: "Suivant" }));

    await choisir(/Prescripteur/, "Dr Amina Berger");
    await user.click(
      screen.getByRole("button", { name: "Accéder au simulateur" })
    );

    // Le simulateur est monté : sa première question apparaît (plus de titre h1).
    expect(
      await screen.findByRole("group", { name: /situations suivantes/i })
    ).toBeInTheDocument();
  });
});
