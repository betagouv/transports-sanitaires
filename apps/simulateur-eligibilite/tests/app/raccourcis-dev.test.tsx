import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../front/app/App";
import { Identification } from "../../front/identification/Identification";
import { Prescripteur } from "../../front/prescripteur/Prescripteur";
import { snapshotReferentiel } from "../../shared/referentiel";

// Les raccourcis dev court-circuitent le parcours : ils doivent être regroupés
// dans un encadré à part, impossible à confondre avec les actions du parcours
// nominal. Ces tests verrouillent cette séparation dans le DOM.

const ENCADRE = { name: "Raccourcis de développement" } as const;

const DEV_IDENTIFICATION = [
  "Résultat favorable",
  "Résultat défavorable",
  "Résultat final — succès",
  "Résultat final — refus",
];

describe("encadré des raccourcis dev — écran d'identification", () => {
  it("regroupe tous les raccourcis dev, et eux seuls", () => {
    render(
      <Identification
        referentiel={snapshotReferentiel}
        onValide={() => {}}
        onAccesDirectDev={() => {}}
      />,
    );

    const encadre = screen.getByRole("region", ENCADRE);
    for (const label of DEV_IDENTIFICATION) {
      expect(within(encadre).getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(within(encadre).getAllByRole("button")).toHaveLength(DEV_IDENTIFICATION.length);
  });

  it("laisse l'action nominale hors de l'encadré", () => {
    render(
      <Identification
        referentiel={snapshotReferentiel}
        onValide={() => {}}
        onAccesDirectDev={() => {}}
      />,
    );

    const encadre = screen.getByRole("region", ENCADRE);
    const acceder = screen.getByRole("button", { name: "Accéder au simulateur" });
    expect(encadre).not.toContainElement(acceder);
  });

  it("garde « Mode test des règles » avec les actions nominales", async () => {
    // Le labo est une vraie fonctionnalité produit (gardée par le service), pas un
    // raccourci dev : il ne doit pas migrer dans l'encadré.
    const user = userEvent.setup();
    render(
      <Identification
        referentiel={snapshotReferentiel}
        onValide={() => {}}
        onAccesLabo={() => {}}
        onAccesDirectDev={() => {}}
      />,
    );

    const choisir = async (label: RegExp, option: string) => {
      const select = screen.getByRole("combobox", { name: label });
      await screen.findByRole("option", { name: option });
      await user.selectOptions(select, option);
    };
    await choisir(/Établissement/, "Libéral / CNAM / CPAM / Autre");
    await choisir(/Nom du service/, "Transport Sanitaire");

    const labo = await screen.findByRole("button", { name: "Mode test des règles" });
    expect(screen.getByRole("region", ENCADRE)).not.toContainElement(labo);
  });

  it("disparaît entièrement quand aucun raccourci n'est fourni", () => {
    render(<Identification referentiel={snapshotReferentiel} onValide={() => {}} />);
    expect(screen.queryByRole("region", ENCADRE)).toBeNull();
  });
});

describe("encadré des raccourcis dev — début du parcours prescripteur", () => {
  it("y range le raccourci vers le CERFA, hors du parcours", () => {
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
        onAllerAuCerfaDev={() => {}}
      />,
    );

    const encadre = screen.getByRole("region", ENCADRE);
    expect(
      within(encadre).getByRole("button", { name: /Aller à la génération du CERFA/i }),
    ).toBeInTheDocument();
    // Le bouton de navigation du parcours reste au-dehors.
    expect(encadre).not.toContainElement(
      screen.getByRole("button", { name: /^suivant$/i }),
    );
  });

  it("n'apparaît pas quand le raccourci n'est pas fourni", () => {
    render(
      <Prescripteur onPasserAuSecretariat={() => {}} onNouvelleSimulation={() => {}} />,
    );
    expect(screen.queryByRole("region", ENCADRE)).toBeNull();
  });
});

describe("App câble les raccourcis dev", () => {
  it("expose l'encadré sur l'écran-porte puis au début du parcours", async () => {
    const user = userEvent.setup();
    render(<App referentiel={snapshotReferentiel} pseudonymiser={async () => null} />);

    // Écran-porte.
    expect(screen.getByRole("region", ENCADRE)).toBeInTheDocument();

    const choisir = async (label: RegExp, option: string) => {
      const select = screen.getByRole("combobox", { name: label });
      await screen.findByRole("option", { name: option });
      await user.selectOptions(select, option);
    };
    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Cardiologie");
    await choisir(/Vous êtes/, "Dr Amina Berger");
    await user.click(screen.getByRole("button", { name: "Accéder au simulateur" }));

    // Début du parcours : un encadré, ne contenant que le raccourci CERFA.
    const encadre = await screen.findByRole("region", ENCADRE);
    expect(within(encadre).getAllByRole("button")).toHaveLength(1);
  });
});
