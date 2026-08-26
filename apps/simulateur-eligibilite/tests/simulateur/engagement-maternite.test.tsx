// A2.4 — la qualification précoce du dispositif Engagement maternité.
//
// La v9.4.0 ajoute une porte d'entrée au dispositif : quand aucun autre motif
// n'ouvre le droit, le questionnaire administratif demande directement si le
// déplacement en relève, au lieu de conclure à la non-éligibilité. Deux choses
// doivent tenir. Le dispositif ne doit pas être reproposé ensuite dans A3.4, où
// il figure aussi — le modèle y pourvoit en rendant A3.4 inapplicable, et c'est
// ce qu'on vérifie ici de bout en bout. Et le mode médical, arrêté en Partie 1,
// ne doit pas bouger : une question administrative n'a jamais ce pouvoir.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import {
  PARTIE_1_SANS_MOTIF,
  type Reponse,
  terminerParcours,
} from "./parcours";

beforeEach(() => sessionStorage.clear());

const MATERNITE = /dispositif Engagement maternité/i;
const SITUATIONS_PARTICULIERES = /une ou plusieurs des situations suivantes/i;
const VSL = "VSL (Véhicule Sanitaire Léger) ou taxi conventionné";

// A2.3 : sans prestation prise en charge, le parcours conclut avant d'atteindre
// A2.4. Le reste des questions est réglé par défaut.
const PRESTATION_PRISE_EN_CHARGE: Reponse = [
  /à l’origine du déplacement/i,
  /^oui$/i,
];

describe("Engagement maternité — qualification précoce (A2.4)", () => {
  it("est posée, et n’est jamais reproposée dans A3.4", async () => {
    const user = userEvent.setup({ delay: null });
    const groupesVus: string[] = [];
    emettrePassation(PARTIE_1_SANS_MOTIF);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    await terminerParcours(
      user,
      [PRESTATION_PRISE_EN_CHARGE, [MATERNITE, /^oui$/i]],
      () => {
        for (const groupe of screen.queryAllByRole("group"))
          groupesVus.push(groupe.textContent ?? "");
      },
    );

    // Le dispositif est demandé une fois, et A3.4 — où il figure aussi — n'est
    // jamais posée : le modèle la rend inapplicable dès qu'A2.4 a répondu.
    // (`surLaPage` voit deux fois chaque page à avancement automatique ; c'est
    // la présence qui compte ici, pas le compte.)
    expect(groupesVus.some((vu) => MATERNITE.test(vu))).toBe(true);
    expect(groupesVus.some((vu) => SITUATIONS_PARTICULIERES.test(vu))).toBe(
      false,
    );
  }, 20_000);

  it("ouvre le droit sous accord préalable, sans toucher au mode médical", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_SANS_MOTIF);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    await terminerParcours(user, [
      PRESTATION_PRISE_EN_CHARGE,
      [MATERNITE, /^oui$/i],
    ]);

    expect(
      screen.getByRole("heading", {
        name: /sous réserve d’un accord préalable/i,
      }),
    ).toBeInTheDocument();
    // Le dispositif est la cause de l'accord préalable, et la seule.
    const motifs = within(
      screen.getByRole("list", { name: /motif ou motifs/i }),
    ).getAllByRole("listitem");
    expect(motifs).toHaveLength(1);
    expect(motifs[0]).toHaveTextContent(MATERNITE);

    // Le mode arrêté en Partie 1 est celui qu'affiche le document.
    expect(screen.getAllByText(VSL).length).toBeGreaterThan(0);
  }, 20_000);

  it("répondre « Non » referme le droit", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_SANS_MOTIF);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    await terminerParcours(user, [
      PRESTATION_PRISE_EN_CHARGE,
      [MATERNITE, /^non$/i],
    ]);

    expect(
      screen.getByRole("heading", {
        name: /n’êtes pas éligible|aucun transport sanitaire/i,
      }),
    ).toBeInTheDocument();
  }, 20_000);
});
