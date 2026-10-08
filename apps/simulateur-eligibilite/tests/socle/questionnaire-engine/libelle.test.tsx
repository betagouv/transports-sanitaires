import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Page } from "../../../front/socle/questionnaire-engine/question";
import { poser } from "./poser";

// Le libellé d'une question peut dépendre des réponses. Le questionnaire
// factice n'en a pas de tel, les pages sont donc écrites ici.

const COMPAGNIE: Page = {
  id: "compagnie",
  questions: [
    {
      id: "compagnie",
      kind: "single choice",
      label: "Venez-vous seul ?",
      options: [
        { value: "seul", label: "Seul" },
        { value: "accompagne", label: "Accompagné" },
      ],
    },
  ],
};

const HEURE: Page = {
  id: "heure",
  questions: [
    {
      id: "heure",
      kind: "text",
      label: "À quelle heure arrivez-vous ?",
      labelFrom: (answers) =>
        answers.compagnie === "accompagne"
          ? "À quelle heure arrivez-vous, vous et votre proche ?"
          : "À quelle heure arrivez-vous, seul ?",
    },
  ],
};

const DUREE: Page = {
  id: "duree",
  questions: [{ id: "duree", kind: "text", label: "Pour combien de temps ?" }],
};

const radio = (name: string) => screen.getByRole("radio", { name });

describe("libellé qui dépend des réponses", () => {
  it("suit la réponse donnée", async () => {
    const { user } = poser([COMPAGNIE, HEURE]);

    await user.click(radio("Accompagné"));

    expect(
      await screen.findByRole("textbox", {
        name: "À quelle heure arrivez-vous, vous et votre proche ?",
      }),
    ).toBeInTheDocument();
  });

  it("change quand la réponse change", async () => {
    const { user } = poser([COMPAGNIE, HEURE]);
    await user.click(radio("Accompagné"));
    await screen.findByRole("textbox");
    await user.click(screen.getByRole("button", { name: "Précédent" }));

    await user.click(radio("Seul"));

    expect(
      await screen.findByRole("textbox", {
        name: "À quelle heure arrivez-vous, seul ?",
      }),
    ).toBeInTheDocument();
  });

  it("reste le libellé déclaré pour une question qui n'en dit rien", async () => {
    poser([DUREE]);

    expect(
      screen.getByRole("textbox", { name: "Pour combien de temps ?" }),
    ).toBeInTheDocument();
  });
});
