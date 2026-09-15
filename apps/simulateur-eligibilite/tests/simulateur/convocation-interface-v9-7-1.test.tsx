// Ce que le `label_when` de la v9.7.1 change à l'écran : la justification de
// la longue distance porte l'énoncé propre à la convocation, et s'atteint sans
// jamais passer par l'écran de distance — que la convocation rend inapplicable
// (CONV971-JUSTIFICATION-AFFICHABLE-SANS-ECRAN-DISTANCE,
// tmp/9.7.1/tests/convocation.mjs).

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { emettrePassation } from "../../front/simulateur/passation";
import { Secretariat } from "../../front/simulateur/secretariat/Secretariat";
import { PARTIE_1_AMBULANCE, type Reponse, terminerParcours } from "./parcours";

beforeEach(() => sessionStorage.clear());

const CONVOCATION_LONGUE_DISTANCE: Reponse[] = [
  [/cas réglementaires/i, /convocation du contrôle médical/i],
  [/plus de 150 km/i],
];

describe("CONV971-JUSTIFICATION-AFFICHABLE-SANS-ECRAN-DISTANCE", () => {
  it("porte le libellé de la convocation, sans jamais passer par l’écran de distance", async () => {
    emettrePassation(PARTIE_1_AMBULANCE);
    const user = userEvent.setup({ delay: null });
    render(<Secretariat onNouvelleSimulation={() => {}} />);

    const titres: string[] = [];
    await terminerParcours(user, CONVOCATION_LONGUE_DISTANCE, () =>
      titres.push(titreDeLaPage()),
    );

    expect(
      titres.some((titre) => /distance du trajet aller/i.test(titre)),
      "écran de distance rencontré",
    ).toBe(false);
    expect(
      titres.some((titre) =>
        /pourquoi cette convocation nécessite/i.test(titre),
      ),
      "libellé de convocation jamais affiché",
    ).toBe(true);
  }, 40_000);
});

// ---- implémentation ----

function titreDeLaPage(): string {
  const saisie = screen.queryAllByRole("textbox")[0] as
    | HTMLInputElement
    | undefined;
  if (saisie) return saisie.labels?.[0]?.textContent ?? "";
  const groupe = screen
    .queryAllByRole("group")
    .find((element) => element.closest("details") === null);
  return groupe?.textContent ?? "";
}
