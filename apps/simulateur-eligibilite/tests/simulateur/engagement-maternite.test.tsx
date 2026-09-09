// Le dispositif Engagement maternité, et la place qu'il occupe dans le parcours.
//
// La v9.4.0 lui donnait une question à lui — A2.4 —, posée quand aucun autre
// motif n'ouvrait le droit, et le reproposait dans la mosaïque des situations
// particulières (A3.4). Deux endroits pour une même chose, que le modèle
// s'employait à ne pas cumuler.
//
// La v9.7 a tranché : c'est un **contexte réglementaire**, coché dans la mosaïque
// des contextes complémentaires, à côté de l'AT/MP et du retour pénitentiaire. Il
// ne figure plus parmi les situations particulières, et n'a plus de question à
// lui. Restent les deux choses qui comptaient déjà : il ouvre le droit sous
// accord préalable, et le mode arrêté en Partie 1 ne bouge pas — une question
// administrative n'a jamais ce pouvoir.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { PARTIE_1_SANS_MOTIF, terminerParcours } from "./parcours";

beforeEach(() => sessionStorage.clear());

const MATERNITE = /engagement maternité/i;
const SITUATIONS_PARTICULIERES = /une des situations suivantes/i;
const VSL = "VSL (Véhicule Sanitaire Léger) ou taxi conventionné";

describe("Engagement maternité — un contexte réglementaire", () => {
  it("est coché parmi les contextes, et non parmi les situations particulières", async () => {
    const user = userEvent.setup({ delay: null });
    const groupesVus: string[] = [];
    emettrePassation(PARTIE_1_SANS_MOTIF);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    await terminerParcours(user, [[MATERNITE]], () => {
      for (const groupe of screen.queryAllByRole("group"))
        groupesVus.push(groupe.textContent ?? "");
    });

    // Les situations particulières restent posées — elles portent l'avion, le
    // CAMSP et le SAMSAH —, mais le dispositif n'y figure plus.
    const situations = groupesVus.filter((vu) =>
      SITUATIONS_PARTICULIERES.test(vu),
    );
    expect(situations.length).toBeGreaterThan(0);
    expect(situations.some((vu) => MATERNITE.test(vu))).toBe(false);
  }, 40_000);

  it("ouvre le droit sous accord préalable, sans toucher au mode médical", async () => {
    const user = userEvent.setup({ delay: null });
    emettrePassation(PARTIE_1_SANS_MOTIF);
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    await terminerParcours(user, [[MATERNITE]]);

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
  }, 40_000);
});
