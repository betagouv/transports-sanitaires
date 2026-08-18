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
//
// L'encadré ne porte qu'une seule action — l'accès à la galerie de seeds : les
// situations elles-mêmes vivent dans `seeds/`, pas dans les écrans.

const ENCADRE = { name: "Raccourcis de développement" } as const;
const GALERIE = { name: "Galerie de seeds" } as const;

describe("encadré des raccourcis dev — écran d'identification", () => {
  it("ne porte que l'accès à la galerie de seeds", () => {
    render(
      <Identification
        referentiel={snapshotReferentiel}
        onValide={() => {}}
        onGalerieSeeds={() => {}}
      />,
    );

    const encadre = screen.getByRole("region", ENCADRE);
    expect(within(encadre).getByRole("button", GALERIE)).toBeInTheDocument();
    expect(within(encadre).getAllByRole("button")).toHaveLength(1);
  });

  it("laisse l'action nominale hors de l'encadré", () => {
    render(
      <Identification
        referentiel={snapshotReferentiel}
        onValide={() => {}}
        onGalerieSeeds={() => {}}
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
        onGalerieSeeds={() => {}}
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
  it("y range l'accès à la galerie, hors du parcours", () => {
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
        onGalerieSeeds={() => {}}
      />,
    );

    const encadre = screen.getByRole("region", ENCADRE);
    expect(within(encadre).getByRole("button", GALERIE)).toBeInTheDocument();
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
    expect(
      within(screen.getByRole("region", ENCADRE)).getByRole("button", GALERIE),
    ).toBeInTheDocument();

    const choisir = async (label: RegExp, option: string) => {
      const select = screen.getByRole("combobox", { name: label });
      await screen.findByRole("option", { name: option });
      await user.selectOptions(select, option);
    };
    await choisir(/Établissement/, "CHU Grenoble Alpes");
    await choisir(/Nom du service/, "Cardiologie");
    await choisir(/Vous êtes/, "Dr Amina Berger");
    await user.click(screen.getByRole("button", { name: "Accéder au simulateur" }));

    // Début du parcours : un encadré, ne contenant que l'accès à la galerie.
    const encadre = await screen.findByRole("region", ENCADRE);
    expect(within(encadre).getAllByRole("button")).toHaveLength(1);
    expect(within(encadre).getByRole("button", GALERIE)).toBeInTheDocument();
  });
});
