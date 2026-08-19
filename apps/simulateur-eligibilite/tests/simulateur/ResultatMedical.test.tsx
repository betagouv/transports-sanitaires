import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prescripteur } from "../../front/simulateur/prescripteur/Prescripteur";
import { passerFiltresM0, terminerParcours } from "./parcours";

beforeEach(() => sessionStorage.clear());

describe("prescripteur — résultat médical", () => {
  it("SMUR → avis médical favorable, passe la main au secrétariat", async () => {
    const user = userEvent.setup();
    const passer = vi.fn();
    render(
      <Prescripteur
        onPasserAuSecretariat={passer}
        onNouvelleSimulation={() => {}}
      />,
    );

    await terminerParcours(user, [[/équipe SMUR/i, "Oui"]]);

    expect(
      screen.getByRole("heading", { name: /avis médical favorable/i }),
    ).toBeInTheDocument();

    // Cas tranché dès la Partie 1 : le CTA mène directement au document.
    await user.click(screen.getByRole("button", { name: /voir le document/i }));
    expect(passer).toHaveBeenCalledTimes(1);
  });
  it("contrainte bariatrique seule → avis défavorable", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />,
    );

    await terminerParcours(user, [[/contrainte bariatrique/i, "Oui"]]);

    expect(
      screen.getByRole("heading", { name: /non justifié médicalement/i }),
    ).toBeInTheDocument();
  });

  it("favorable : le bloc « Information destinée au patient » liste critères et motifs retenus", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />,
    );

    await passerFiltresM0(user);

    // Motif : hospitalisation → attendu dans les motifs ouvrant droit.
    await user.click(
      within(
        screen.getByRole("group", {
          name: /quelle situation justifie le transport/i,
        }),
      ).getByRole("checkbox", { name: /hospitalisation/i }),
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    await user.click(
      within(screen.getByRole("group", { name: /^le patient/i })).getByRole(
        "radio",
        { name: /aucune de ces situations/i },
      ),
    );
    await user.click(screen.getByRole("button", { name: /^suivant$/i }));

    // Critère : « Aucune situation » → attendu dans les critères retenus.
    await user.click(
      within(
        screen.getByRole("group", { name: /prise en charge plus encadrée/i }),
      ).getByRole("checkbox", { name: /aucune de ces situations/i }),
    );
    await user.click(screen.getByRole("button", { name: /^voir/i }));

    expect(
      screen.getByRole("heading", { name: /information destinée au patient/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /critères médicaux retenus/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /aucune situation nécessitant une prise en charge plus encadrée/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /motifs ouvrant droit/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/entrée ou sortie d’hospitalisation/i),
    ).toBeInTheDocument();
  });

  it("défavorable : le bloc patient explique les deux conditions manquantes", async () => {
    const user = userEvent.setup();
    render(
      <Prescripteur
        onPasserAuSecretariat={() => {}}
        onNouvelleSimulation={() => {}}
      />,
    );

    await terminerParcours(user, [[/contrainte bariatrique/i, "Oui"]]);

    expect(
      screen.getByRole("heading", { name: /information destinée au patient/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/deux éléments doivent être réunis/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/une situation ouvrant droit à la prise en charge/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/un besoin médical de transport adapté/i),
    ).toBeInTheDocument();
    // Aucune section « critères/motifs retenus » quand l'avis est défavorable.
    expect(
      screen.queryByRole("heading", { name: /critères médicaux retenus/i }),
    ).toBeNull();
  });
});
