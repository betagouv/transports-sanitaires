import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../../../front/socle/app/App";
import {
  DeveloperTools,
  ToolButton,
} from "../../../front/socle/developerTools/DeveloperTools";
import { RattachementForm } from "../../../front/socle/rattachement/RattachementForm";
import { Simulateur } from "../../../front/socle/simulateur/Simulateur";
import { snapshotReferentiel } from "../../../shared/referentiel";
import {
  remplirRattachement,
  remplirRattachementProduit,
  seRattacherProduit,
} from "../se-rattacher";

// Les developer tools court-circuitent le questionnaire. Ils sont regroupés dans
// un encadré à part, distinct des actions normales. Ils existent sur tous les
// environnements, mais pour le seul service n° 4.

const ENCADRE = { name: "Developer tools" } as const;
const ECRAN_SEEDS = { name: "Seeds" } as const;

describe("encadré des developer tools, écran de rattachement", () => {
  it("n'apparaît pas pour un service ordinaire", async () => {
    const user = userEvent.setup();
    render(
      <RattachementForm
        referentiel={snapshotReferentiel}
        onValide={() => {}}
      />,
    );

    await remplirRattachement(user);
    expect(screen.queryByRole("region", ENCADRE)).toBeNull();
  });

  it("apparaît pour le service n° 4, avec l'écran des seeds et lui seul", async () => {
    const user = userEvent.setup();
    render(
      <RattachementForm
        referentiel={snapshotReferentiel}
        onValide={() => {}}
      />,
    );

    await remplirRattachementProduit(user);

    const encadre = screen.getByRole("region", ENCADRE);
    expect(
      within(encadre).getByRole("button", ECRAN_SEEDS),
    ).toBeInTheDocument();
    expect(within(encadre).getAllByRole("button")).toHaveLength(1);
  });

  it("laisse l'action nominale hors de l'encadré", async () => {
    const user = userEvent.setup();
    render(
      <RattachementForm
        referentiel={snapshotReferentiel}
        onValide={() => {}}
      />,
    );

    await remplirRattachementProduit(user);
    const encadre = screen.getByRole("region", ENCADRE);
    const acceder = screen.getByRole("button", {
      name: "Accéder au simulateur",
    });
    expect(encadre).not.toContainElement(acceder);
  });

  it("n'apparaît qu'une fois l'établissement et le service choisis", async () => {
    // Y entrer reste une entrée dans l'application : elle passe par l'écran de
    // rattachement (ADR-1).
    const user = userEvent.setup();
    render(
      <RattachementForm
        referentiel={snapshotReferentiel}
        onValide={() => {}}
      />,
    );

    const select = screen.getByRole("combobox", { name: /Établissement/ });
    await screen.findByRole("option", {
      name: "Libéral / CNAM / CPAM / Autre",
    });
    await user.selectOptions(select, "Libéral / CNAM / CPAM / Autre");
    expect(screen.queryByRole("region", ENCADRE)).toBeNull();

    const service = screen.getByRole("combobox", { name: /Nom du service/ });
    await screen.findByRole("option", { name: "Transport Sanitaire" });
    await user.selectOptions(service, "Transport Sanitaire");
    expect(screen.getByRole("button", ECRAN_SEEDS)).toBeEnabled();
  });

  it("remonte la destination choisie avec le rattachement et l'accès", async () => {
    const user = userEvent.setup();
    const onValide = vi.fn();
    render(
      <RattachementForm
        referentiel={snapshotReferentiel}
        onValide={onValide}
      />,
    );

    await remplirRattachementProduit(user);
    await user.click(screen.getByRole("button", ECRAN_SEEDS));

    expect(onValide).toHaveBeenCalledWith(
      { etabId: "e_liberal_cnam", serviceId: "s_transport_sanitaire" },
      {
        destination: "seeds",
        developerTools: true,
      },
    );
  });
});

describe("encadré des developer tools, début du parcours", () => {
  it("y range l'accès à l'écran des seeds, hors du parcours", () => {
    render(
      <Simulateur
        onNewSimulation={() => {}}
        developerToolsPanel={
          <DeveloperTools>
            <ToolButton onClick={() => {}}>Seeds</ToolButton>
          </DeveloperTools>
        }
      />,
    );

    const encadre = screen.getByRole("region", ENCADRE);
    expect(
      within(encadre).getByRole("button", ECRAN_SEEDS),
    ).toBeInTheDocument();
    // Le stepper reste hors de l'encadré. La première question est à choix
    // unique : elle avance seule, sans bouton de navigation.
    expect(encadre).not.toContainElement(
      screen.getByRole("heading", { name: /^étape \d+ sur \d+$/i }),
    );
  });

  it("n'apparaît pas quand l'accès n'est pas fourni", () => {
    render(<Simulateur onNewSimulation={() => {}} />);
    expect(screen.queryByRole("region", ENCADRE)).toBeNull();
  });
});

describe("App câble les developer tools", () => {
  it("les reproposent au début du parcours après un rattachement service n° 4", async () => {
    const user = userEvent.setup();
    render(<App referentiel={snapshotReferentiel} />);

    await seRattacherProduit(user);

    const encadre = await screen.findByRole("region", ENCADRE);
    expect(within(encadre).getAllByRole("button")).toHaveLength(1);
    expect(
      within(encadre).getByRole("button", ECRAN_SEEDS),
    ).toBeInTheDocument();
  });

  it("ne les propose pas après un rattachement ordinaire", async () => {
    const user = userEvent.setup();
    render(<App referentiel={snapshotReferentiel} />);

    await remplirRattachement(user);
    expect(screen.queryByRole("region", ENCADRE)).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Accéder au simulateur" }),
    );

    expect(
      await screen.findByRole("group", {
        name: /^quelle boisson souhaitez-vous/i,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("region", ENCADRE)).toBeNull();
  });
});
