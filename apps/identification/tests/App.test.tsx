import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import { PRESCRIPTEUR_AUTRE } from "../src/selection";

async function choisir(labelSelect: RegExp, optionLabel: string) {
  const select = screen.getByRole("combobox", { name: labelSelect });
  await screen.findByRole("option", { name: optionLabel });
  await userEvent.selectOptions(select, optionLabel);
}

describe("parcours d'identification", () => {
  it("transmet un contexte d'identifiants opaques au simulateur", async () => {
    const onValider = vi.fn();
    render(<App onValider={onValider} />);

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Service/, "Cardiologie");
    await userEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await choisir(/Prescripteur/, "Dr Amina Berger");
    await userEvent.click(
      screen.getByRole("button", { name: "Accéder au simulateur" })
    );

    expect(onValider).toHaveBeenCalledWith({
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      prescripteurId: "p_grenoble_cardio_1",
    });
  });

  it("gère le prescripteur « autre » (non répertorié)", async () => {
    const onValider = vi.fn();
    render(<App onValider={onValider} />);

    await choisir(/Établissement/, "Centre hospitalier de Chambéry");
    await choisir(/Service/, "Urgences");
    await userEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await choisir(/Prescripteur/, "Autre / prescripteur non répertorié");
    await userEvent.click(
      screen.getByRole("button", { name: "Accéder au simulateur" })
    );

    expect(onValider).toHaveBeenCalledWith(
      expect.objectContaining({ prescripteurId: PRESCRIPTEUR_AUTRE })
    );
  });

  it("n'autorise pas le passage à l'étape 2 sans service", async () => {
    render(<App onValider={vi.fn()} />);

    await choisir(/Établissement/, "CHU Grenoble Alpes");

    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
  });
});
