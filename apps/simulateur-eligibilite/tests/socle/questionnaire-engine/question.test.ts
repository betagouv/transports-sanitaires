import { describe, expect, it } from "vitest";
import {
  askedPages,
  type Page,
} from "../../../front/socle/questionnaire-engine/question";

// Après le verrou, une question peut dépendre de la préconisation : sa condition
// lit les cibles figées, en plus des réponses. Le questionnaire factice n'a pas
// de telle question, les pages sont donc écrites ici.

const TOUJOURS: Page = {
  id: "adresse",
  questions: [{ id: "adresse", kind: "text", label: "Adresse" }],
};

const SI_URGENCE: Page = {
  id: "urgence",
  questions: [
    {
      id: "precision",
      kind: "text",
      label: "Précision sur l'urgence",
      askedIf: (_, cibles) => cibles?.urgence === true,
    },
  ],
};

const posees = (cibles: Record<string, unknown>) =>
  askedPages([TOUJOURS, SI_URGENCE], {}, cibles).map((page) => page.id);

describe("condition d'une question sur les cibles", () => {
  it("pose la question quand la cible le demande", () => {
    expect(posees({ urgence: true })).toEqual(["adresse", "urgence"]);
  });

  it("ne la pose pas sinon", () => {
    expect(posees({ urgence: false })).toEqual(["adresse"]);
  });
});
