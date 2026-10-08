import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Page } from "../../../front/socle/questionnaire-engine/question";
import { poser } from "./poser";

// Une option peut porter une explication, rendue sous son libellé : ce sont les
// cartes radio du DSFR. Le questionnaire factice n'en a pas, la page est donc
// écrite ici.

const DUREE: Page = {
  id: "duree",
  questions: [
    {
      id: "duree",
      kind: "single choice",
      label: "Combien de temps avez-vous ?",
      options: [
        { value: "peu", label: "Peu", description: "Environ 2 minutes." },
        { value: "beaucoup", label: "Beaucoup" },
      ],
    },
  ],
};

describe("explication d'une option", () => {
  it("se lit avec le libellé de l'option qui la porte", () => {
    poser([DUREE]);

    expect(
      screen.getByRole("radio", { name: "Peu Environ 2 minutes." }),
    ).toBeInTheDocument();
  });

  it("ne change rien à une option qui n'en a pas", () => {
    poser([DUREE]);

    expect(screen.getByRole("radio", { name: "Beaucoup" })).toBeInTheDocument();
  });
});
