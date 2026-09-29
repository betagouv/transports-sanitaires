import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Rattachement } from "../../front/rattachement/Rattachement";

async function choisir(labelSelect: RegExp, optionLabel: string) {
  const select = screen.getByRole("combobox", { name: labelSelect });
  await screen.findByRole("option", { name: optionLabel });
  await userEvent.selectOptions(select, optionLabel);
}

const valider = () =>
  userEvent.click(
    screen.getByRole("button", { name: "Accéder au simulateur" }),
  );

describe("parcours de rattachement", () => {
  it("établissement → service suffit, sans demander qui répond", async () => {
    const onValide = vi.fn();
    render(<Rattachement onValide={onValide} />);

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Cardiologie");
    expect(screen.queryByRole("combobox", { name: /Vous êtes/ })).toBeNull();
    await valider();

    expect(onValide).toHaveBeenCalledWith(
      { etabId: "e_chu_grenoble", serviceId: "s_grenoble_cardio" },
      { destination: "simulateur", outilsProduit: false },
    );
  });

  it("annonce ce qui est demandé : l'établissement et le service", () => {
    render(<Rattachement onValide={vi.fn()} />);

    expect(
      screen.getByRole("heading", {
        name: /renseigner votre établissement et votre service/i,
      }),
    ).toBeInTheDocument();
  });

  it("propose les outils produit seulement pour le service « Transport Sanitaire »", async () => {
    // Garde d'accès par le service, sur tous les environnements (cf. estServiceProduit).
    render(<Rattachement onValide={vi.fn()} />);

    const labo = { name: "Mode test des règles" };

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Cardiologie");
    expect(screen.queryByRole("button", labo)).toBeNull();

    await choisir(/Établissement/, "Libéral / CNAM / CPAM / Autre");
    await choisir(/Nom du service/, "Transport Sanitaire");
    expect(screen.getByRole("button", labo)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Galerie de seeds" }),
    ).toBeInTheDocument();
  });

  it("établissement « Libéral / CNAM / CPAM / Autre » → service, sans branche dédiée", async () => {
    // Le prescripteur sans établissement de rattachement passe par
    // l'établissement fourre-tout du référentiel.
    const onValide = vi.fn();
    render(<Rattachement onValide={onValide} />);

    await choisir(/Établissement/, "Libéral / CNAM / CPAM / Autre");
    await choisir(/Nom du service/, "Libéral");
    await valider();

    expect(onValide).toHaveBeenCalledWith(
      { etabId: "e_liberal_cnam", serviceId: "s_liberal" },
      { destination: "simulateur", outilsProduit: false },
    );
  });

  it("service « Autre » → vrai service saisi", async () => {
    const onValide = vi.fn();
    render(<Rattachement onValide={onValide} />);

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Autre");
    await userEvent.type(
      screen.getByRole("textbox", { name: "Nom de votre service / unité" }),
      "Néphrologie",
    );
    await valider();

    expect(onValide).toHaveBeenCalledWith(
      {
        etabId: "e_chu_grenoble",
        serviceId: "s_grenoble_autre",
        serviceEstAutre: true,
        serviceLibre: "Néphrologie",
      },
      { destination: "simulateur", outilsProduit: false },
    );
  });

  it("service « Autre » : validation désactivée tant que le service réel n'est pas saisi", async () => {
    render(<Rattachement onValide={vi.fn()} />);

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Autre");
    // Service réel encore vide → bouton désactivé.
    expect(
      screen.getByRole("button", { name: "Accéder au simulateur" }),
    ).toBeDisabled();

    await userEvent.type(
      screen.getByRole("textbox", { name: "Nom de votre service / unité" }),
      "Néphrologie",
    );
    expect(
      screen.getByRole("button", { name: "Accéder au simulateur" }),
    ).toBeEnabled();
  });

  it("trie les listes déroulantes par ordre alphabétique", async () => {
    render(<Rattachement onValide={vi.fn()} />);

    // Établissements : « Centre hospitalier de Chambéry » avant « CHU Grenoble
    // Alpes » avant « Clinique Belledonne » (tri insensible à la casse).
    const selectEtab = screen.getByRole("combobox", { name: /Établissement/ });
    await within(selectEtab).findByRole("option", {
      name: "CHU Grenoble Alpes",
    });
    const etabs = within(selectEtab)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(etabs.indexOf("Centre hospitalier de Chambéry")).toBeLessThan(
      etabs.indexOf("CHU Grenoble Alpes"),
    );
    expect(etabs.indexOf("CHU Grenoble Alpes")).toBeLessThan(
      etabs.indexOf("Clinique Belledonne"),
    );

    // Services de Chambéry : triés « Médecine interne » avant « Urgences », alors
    // que le référentiel les fournit dans l'ordre inverse.
    await choisir(/Établissement/, "Centre hospitalier de Chambéry");
    const selectService = screen.getByRole("combobox", {
      name: /Nom du service/,
    });
    await within(selectService).findByRole("option", { name: "Urgences" });
    const services = within(selectService)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(services.indexOf("Médecine interne")).toBeLessThan(
      services.indexOf("Urgences"),
    );
    // « Autre » reste en fin de liste, malgré son rang alphabétique (A…).
    expect(services.filter((s) => s !== "Sélectionnez un service").at(-1)).toBe(
      "Autre",
    );
  });

  it("désactive la validation tant que la branche est incomplète", async () => {
    render(<Rattachement onValide={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: "Accéder au simulateur" }),
    ).toBeDisabled();

    await choisir(/Établissement/, "CHU Grenoble Alpes");
    // service non encore choisi → toujours désactivé
    expect(
      screen.getByRole("button", { name: "Accéder au simulateur" }),
    ).toBeDisabled();
  });
});
