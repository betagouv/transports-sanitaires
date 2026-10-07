import { describe, expect, it } from "vitest";
import { commitPage } from "../../../front/socle/questionnaire-engine/page-commit";
import type {
  Page,
  Question,
} from "../../../front/socle/questionnaire-engine/question";

// Une réponse qui change n'efface que les réponses qui en dépendent. Les pages
// sont écrites ici : le questionnaire factice n'a qu'une seule dépendance.

const texte = (id: string, dependsOn?: string[]): Question => ({
  id,
  kind: "text",
  label: id,
  dependsOn,
});

const page = (question: Question): Page => ({
  id: question.id,
  part: 1,
  questions: [question],
});

const SOURCE = page(texte("source"));
const PAGES = [
  SOURCE,
  page(texte("dependante", ["source"])),
  page(texte("dependante-de-dependante", ["dependante"])),
  page(texte("independante")),
];

const REPONSES = {
  source: "a",
  dependante: "b",
  "dependante-de-dependante": "c",
  independante: "d",
};

describe("validation d'une page", () => {
  it("efface les réponses dépendantes, de proche en proche", () => {
    expect(commitPage(PAGES, REPONSES, SOURCE, { source: "z" })).toEqual({
      source: "z",
      independante: "d",
    });
  });

  it("ne touche à rien quand la réponse est la même", () => {
    expect(commitPage(PAGES, REPONSES, SOURCE, { source: "a" })).toEqual(
      REPONSES,
    );
  });

  it("retire la réponse d'une question que la page ne pose plus", () => {
    const { source: _retiree, ...sansSource } = REPONSES;
    expect(commitPage(PAGES, REPONSES, SOURCE, {})).toEqual({
      independante: sansSource.independante,
    });
  });
});
