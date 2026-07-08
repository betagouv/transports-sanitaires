import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Identification } from "../../front/identification/Identification";
import { PRESCRIPTEUR_AUTRE } from "../../shared/selection";

async function choisir(labelSelect: RegExp, optionLabel: string) {
  const select = screen.getByRole("combobox", { name: labelSelect });
  await screen.findByRole("option", { name: optionLabel });
  await userEvent.selectOptions(select, optionLabel);
}

describe("parcours d'identification", () => {
  it("remonte la sélection d'identifiants opaques à la validation", async () => {
    const onValide = vi.fn();
    render(<Identification onValide={onValide} />);

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Service/, "Cardiologie");
    await userEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await choisir(/Prescripteur/, "Dr Amina Berger");
    await userEvent.click(
      screen.getByRole("button", { name: "Accéder au simulateur" })
    );

    expect(onValide).toHaveBeenCalledWith({
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      prescripteurId: "p_grenoble_cardio_1",
    });
  });

  it("gère le prescripteur « autre » (non répertorié)", async () => {
    const onValide = vi.fn();
    render(<Identification onValide={onValide} />);

    await choisir(/Établissement/, "Centre hospitalier de Chambéry");
    await choisir(/Service/, "Urgences");
    await userEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await choisir(/Prescripteur/, "Autre / prescripteur non répertorié");
    await userEvent.click(
      screen.getByRole("button", { name: "Accéder au simulateur" })
    );

    expect(onValide).toHaveBeenCalledWith(
      expect.objectContaining({ prescripteurId: PRESCRIPTEUR_AUTRE })
    );
  });

  it("n'autorise pas le passage à l'étape 2 sans service", async () => {
    render(<Identification onValide={vi.fn()} />);

    await choisir(/Établissement/, "CHU Grenoble Alpes");

    expect(screen.getByRole("button", { name: "Suivant" })).toBeDisabled();
  });
});
