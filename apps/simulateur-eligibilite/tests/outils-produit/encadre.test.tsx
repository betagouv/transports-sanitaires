import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../front/app/App";
import { Identification } from "../../front/identification/Identification";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { snapshotReferentiel } from "../../shared/referentiel";
import { remplirIdentite, remplirIdentiteProduit, sIdentifierProduit } from "../porte";

// Les outils produit (galerie de seeds, mode test des règles) court-circuitent le
// parcours : ils doivent être regroupés dans un encadré à part, impossible à
// confondre avec les actions nominales. Ils sont disponibles sur **tous** les
// environnements, mais seulement pour le service n° 4 : c'est le service qui garde
// l'accès, plus le build.

const ENCADRE = { name: "Outils produit" } as const;
const GALERIE = { name: "Galerie de seeds" } as const;
const LABO = { name: "Mode test des règles" } as const;

describe("encadré des outils produit — écran d'identification", () => {
  it("n'apparaît pas pour un service ordinaire", async () => {
    const user = userEvent.setup();
    render(<Identification referentiel={snapshotReferentiel} onValide={() => {}} />);

    await remplirIdentite(user);
    expect(screen.queryByRole("region", ENCADRE)).toBeNull();
  });

  it("apparaît pour le service n° 4, avec les deux outils et eux seuls", async () => {
    const user = userEvent.setup();
    render(<Identification referentiel={snapshotReferentiel} onValide={() => {}} />);

    await remplirIdentiteProduit(user);

    const encadre = screen.getByRole("region", ENCADRE);
    expect(within(encadre).getByRole("button", GALERIE)).toBeInTheDocument();
    expect(within(encadre).getByRole("button", LABO)).toBeInTheDocument();
    expect(within(encadre).getAllByRole("button")).toHaveLength(2);
  });

  it("laisse l'action nominale hors de l'encadré", async () => {
    const user = userEvent.setup();
    render(<Identification referentiel={snapshotReferentiel} onValide={() => {}} />);

    await remplirIdentiteProduit(user);
    const encadre = screen.getByRole("region", ENCADRE);
    const acceder = screen.getByRole("button", { name: "Accéder au simulateur" });
    expect(encadre).not.toContainElement(acceder);
  });

  it("garde les outils désactivés tant que l'identification est incomplète", async () => {
    // Y entrer reste une entrée dans l'application : elle passe par la porte
    // (ADR-1), quelle que soit la destination.
    const user = userEvent.setup();
    render(<Identification referentiel={snapshotReferentiel} onValide={() => {}} />);

    const select = screen.getByRole("combobox", { name: /Établissement/ });
    await screen.findByRole("option", { name: "Libéral / CNAM / CPAM / Autre" });
    await user.selectOptions(select, "Libéral / CNAM / CPAM / Autre");
    const service = screen.getByRole("combobox", { name: /Nom du service/ });
    await screen.findByRole("option", { name: "Transport Sanitaire" });
    await user.selectOptions(service, "Transport Sanitaire");

    // Le prescripteur n'est pas encore renseigné.
    expect(screen.getByRole("button", GALERIE)).toBeDisabled();
    expect(screen.getByRole("button", LABO)).toBeDisabled();
  });

  it("remonte la destination choisie avec l'identité et l'accès", async () => {
    const user = userEvent.setup();
    const onValide = vi.fn();
    render(<Identification referentiel={snapshotReferentiel} onValide={onValide} />);

    await remplirIdentiteProduit(user);
    await user.click(screen.getByRole("button", LABO));

    expect(onValide).toHaveBeenCalledWith(expect.objectContaining({ nom: "Durand" }), {
      destination: "labo",
      outilsProduit: true,
    });
  });
});

describe("encadré des outils produit — début du parcours prescripteur", () => {
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

  it("n'apparaît pas quand l'accès n'est pas fourni", () => {
    render(
      <Prescripteur onPasserAuSecretariat={() => {}} onNouvelleSimulation={() => {}} />,
    );
    expect(screen.queryByRole("region", ENCADRE)).toBeNull();
  });
});

describe("App câble les outils produit", () => {
  it("les reproposent au début du parcours après une identification service n° 4", async () => {
    const user = userEvent.setup();
    render(<App referentiel={snapshotReferentiel} pseudonymiser={async () => null} />);

    await sIdentifierProduit(user);

    const encadre = await screen.findByRole("region", ENCADRE);
    expect(within(encadre).getAllByRole("button")).toHaveLength(1);
    expect(within(encadre).getByRole("button", GALERIE)).toBeInTheDocument();
  });

  it("ne les propose pas après une identification ordinaire", async () => {
    const user = userEvent.setup();
    render(<App referentiel={snapshotReferentiel} pseudonymiser={async () => null} />);

    await remplirIdentite(user);
    expect(screen.queryByRole("region", ENCADRE)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Accéder au simulateur" }));

    expect(await screen.findByRole("group", { name: /équipe SMUR/i })).toBeInTheDocument();
    expect(screen.queryByRole("region", ENCADRE)).toBeNull();
  });
});
