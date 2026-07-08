import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Identification } from "../../front/identification/Identification";
import {
  ETAB_NON_RATTACHE,
  PRESCRIPTEUR_HORS_LISTE,
  SERVICE_AUTRE,
} from "../../shared/selection";

async function choisir(labelSelect: RegExp, optionLabel: string) {
  const select = screen.getByRole("combobox", { name: labelSelect });
  await screen.findByRole("option", { name: optionLabel });
  await userEvent.selectOptions(select, optionLabel);
}

const valider = () =>
  userEvent.click(screen.getByRole("button", { name: "Accéder au simulateur" }));

describe("parcours d'identification", () => {
  it("branche établissement → service → prescripteur du référentiel", async () => {
    const onValide = vi.fn();
    render(<Identification onValide={onValide} />);

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Cardiologie");
    await choisir(/Vous êtes/, "Dr Amina Berger");
    await valider();

    expect(onValide).toHaveBeenCalledWith({
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      prescripteurId: "p_grenoble_cardio_1",
    });
  });

  it("prescripteur hors liste → saisie nom/prénom", async () => {
    const onValide = vi.fn();
    render(<Identification onValide={onValide} />);

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Cardiologie");
    await choisir(/Vous êtes/, "Je ne suis pas dans la liste");
    await userEvent.type(screen.getByRole("textbox", { name: "Nom" }), "Dupont");
    await userEvent.type(screen.getByRole("textbox", { name: "Prénom" }), "Marie");
    await valider();

    expect(onValide).toHaveBeenCalledWith({
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      prescripteurId: PRESCRIPTEUR_HORS_LISTE,
      nom: "Dupont",
      prenom: "Marie",
    });
  });

  it("non rattaché → catégorie → saisie nom/prénom", async () => {
    const onValide = vi.fn();
    render(<Identification onValide={onValide} />);

    await choisir(/Établissement/, "Je ne suis pas rattaché à un établissement de santé");
    await choisir(/Précisez votre situation/, "J'exerce en libéral");
    await userEvent.type(screen.getByRole("textbox", { name: "Nom" }), "Martin");
    await userEvent.type(screen.getByRole("textbox", { name: "Prénom" }), "Paul");
    await valider();

    expect(onValide).toHaveBeenCalledWith({
      etabId: ETAB_NON_RATTACHE,
      categorie: "liberal",
      nom: "Martin",
      prenom: "Paul",
    });
  });

  it("service « autre » → nom de service libre", async () => {
    const onValide = vi.fn();
    render(<Identification onValide={onValide} />);

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Autre");
    await userEvent.type(
      screen.getByRole("textbox", { name: /Précisez le nom de votre service/ }),
      "Consultations externes"
    );
    await valider();

    expect(onValide).toHaveBeenCalledWith({
      etabId: "e_chu_grenoble",
      serviceId: SERVICE_AUTRE,
      serviceLibre: "Consultations externes",
    });
  });

  it("désactive la validation tant que la branche est incomplète", async () => {
    render(<Identification onValide={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Accéder au simulateur" })
    ).toBeDisabled();

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    // service non encore choisi → toujours désactivé
    expect(
      screen.getByRole("button", { name: "Accéder au simulateur" })
    ).toBeDisabled();
  });
});
