import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Identification } from "../../front/identification/Identification";
import {
  PRESCRIPTEUR_HORS_LISTE,
  SERVICE_AUTRE,
} from "../../shared/identite-saisie";

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
    await userEvent.type(screen.getByRole("textbox", { name: "Votre nom" }), "Dupont");
    await userEvent.type(screen.getByRole("textbox", { name: "Votre prénom" }), "Marie");
    await valider();

    expect(onValide).toHaveBeenCalledWith({
      etabId: "e_chu_grenoble",
      serviceId: "s_grenoble_cardio",
      prescripteurId: PRESCRIPTEUR_HORS_LISTE,
      nom: "Dupont",
      prenom: "Marie",
    });
  });

  it("établissement « Libéral / CNAM / CPAM / Autre » → service → hors liste → nom/prénom", async () => {
    // Le prescripteur sans établissement de rattachement passe désormais par
    // l'établissement fourre-tout du référentiel, sans branche dédiée.
    const onValide = vi.fn();
    render(<Identification onValide={onValide} />);

    await choisir(/Établissement/, "Libéral / CNAM / CPAM / Autre");
    await choisir(/Nom du service/, "Libéral");
    await choisir(/Vous êtes/, "Je ne suis pas dans la liste");
    await userEvent.type(screen.getByRole("textbox", { name: "Votre nom" }), "Martin");
    await userEvent.type(screen.getByRole("textbox", { name: "Votre prénom" }), "Paul");
    await valider();

    expect(onValide).toHaveBeenCalledWith({
      etabId: "e_liberal_cnam",
      serviceId: "s_liberal",
      prescripteurId: PRESCRIPTEUR_HORS_LISTE,
      nom: "Martin",
      prenom: "Paul",
    });
  });

  it("service « autre » → nom de service libre + nom/prénom", async () => {
    const onValide = vi.fn();
    render(<Identification onValide={onValide} />);

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Autre");
    await userEvent.type(
      screen.getByRole("textbox", { name: /Précisez le nom de votre service/ }),
      "Consultations externes"
    );
    await userEvent.type(screen.getByRole("textbox", { name: "Votre nom" }), "Durand");
    await userEvent.type(screen.getByRole("textbox", { name: "Votre prénom" }), "Léa");
    await valider();

    expect(onValide).toHaveBeenCalledWith({
      etabId: "e_chu_grenoble",
      serviceId: SERVICE_AUTRE,
      serviceLibre: "Consultations externes",
      nom: "Durand",
      prenom: "Léa",
    });
  });

  it("trie les listes déroulantes par ordre alphabétique", async () => {
    render(<Identification onValide={vi.fn()} />);

    // Établissements : « Centre hospitalier de Chambéry » avant « CHU Grenoble
    // Alpes » avant « Clinique Belledonne » (tri insensible à la casse).
    const selectEtab = screen.getByRole("combobox", { name: /Établissement/ });
    await within(selectEtab).findByRole("option", { name: "CHU Grenoble Alpes" });
    const etabs = within(selectEtab)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(etabs.indexOf("Centre hospitalier de Chambéry")).toBeLessThan(
      etabs.indexOf("CHU Grenoble Alpes")
    );
    expect(etabs.indexOf("CHU Grenoble Alpes")).toBeLessThan(
      etabs.indexOf("Clinique Belledonne")
    );

    // Services de Chambéry : triés « Médecine interne » avant « Urgences », alors
    // que le référentiel les fournit dans l'ordre inverse.
    await choisir(/Établissement/, "Centre hospitalier de Chambéry");
    const selectService = screen.getByRole("combobox", { name: /Nom du service/ });
    await within(selectService).findByRole("option", { name: "Urgences" });
    const services = within(selectService)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(services.indexOf("Médecine interne")).toBeLessThan(
      services.indexOf("Urgences")
    );
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
