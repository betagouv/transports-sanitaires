import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Page } from "../../../front/socle/questionnaire-engine/question";
import { poser } from "./poser";

// Une option peut ne se proposer que pour certaines réponses. Le questionnaire
// factice n'en a pas, les pages sont donc écrites ici.

const REGIME: Page = {
  id: "regime",
  questions: [
    {
      id: "regime",
      kind: "single choice",
      label: "Quel est votre régime ?",
      options: [
        { value: "tout", label: "Je mange de tout" },
        { value: "vegetarien", label: "Végétarien" },
      ],
    },
  ],
};

const PLATS: Page = {
  id: "plats",
  questions: [
    {
      id: "plats",
      kind: "multiple choice",
      label: "Quels plats ?",
      options: [
        { value: "salade", label: "Une salade" },
        {
          value: "steak",
          label: "Un steak",
          offeredIf: (answers) => answers.regime === "tout",
        },
      ],
      exclusiveOption: { value: "rien", label: "Rien" },
    },
  ],
};

const DESSERT: Page = {
  id: "dessert",
  questions: [{ id: "dessert", kind: "text", label: "Quel dessert ?" }],
};

const PLATS_POSES = { name: /^quels plats/i };
const radio = (name: string) => screen.getByRole("radio", { name });
const caseACocher = (name: string) => screen.getByRole("checkbox", { name });
const bouton = (name: string) => screen.getByRole("button", { name });

describe("option qui dépend des réponses", () => {
  it("se propose quand les réponses le permettent", async () => {
    const { user } = poser([REGIME, PLATS]);

    await user.click(radio("Je mange de tout"));

    await screen.findByRole("group", PLATS_POSES);
    expect(caseACocher("Un steak")).toBeInTheDocument();
  });

  it("ne se propose pas sinon", async () => {
    const { user } = poser([REGIME, PLATS]);

    await user.click(radio("Végétarien"));

    await screen.findByRole("group", PLATS_POSES);
    expect(screen.queryByRole("checkbox", { name: "Un steak" })).toBeNull();
    expect(caseACocher("Une salade")).toBeInTheDocument();
  });

  it("quitte la réponse quand elle ne se propose plus", async () => {
    const { user, reponses } = poser([REGIME, PLATS, DESSERT]);
    await user.click(radio("Je mange de tout"));
    await screen.findByRole("group", PLATS_POSES);
    await user.click(caseACocher("Une salade"));
    await user.click(caseACocher("Un steak"));
    await user.click(bouton("Suivant"));

    await user.click(bouton("Précédent"));
    await user.click(bouton("Précédent"));
    await user.click(radio("Végétarien"));
    await screen.findByRole("group", PLATS_POSES);
    await user.click(bouton("Suivant"));
    await user.type(screen.getByRole("textbox"), "Une tarte");
    await user.click(bouton("Terminer"));

    expect(reponses()).toEqual({
      regime: "vegetarien",
      plats: ["salade"],
      dessert: "Une tarte",
    });
  });

  it("laisse la question sans réponse quand il n'en reste rien", async () => {
    const { user } = poser([REGIME, PLATS, DESSERT]);
    await user.click(radio("Je mange de tout"));
    await screen.findByRole("group", PLATS_POSES);
    await user.click(caseACocher("Un steak"));
    await user.click(bouton("Suivant"));

    await user.click(bouton("Précédent"));
    await user.click(bouton("Précédent"));
    await user.click(radio("Végétarien"));

    await screen.findByRole("group", PLATS_POSES);
    expect(bouton("Suivant")).toBeDisabled();
  });
});
