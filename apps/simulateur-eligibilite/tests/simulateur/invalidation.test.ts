import { describe, expect, it } from "vitest";
import { withValidatedPage } from "../../front/simulateur/questionnaire/invalidation";
import type {
  Page,
  Question,
} from "../../front/simulateur/questionnaire/question";

// Une réponse qui change n'efface que les réponses qui en dépendent. Les pages
// sont écrites ici : le questionnaire factice n'a qu'une dépendance, pas de quoi
// montrer ce qui reste.

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
    expect(withValidatedPage(PAGES, REPONSES, SOURCE, { source: "z" })).toEqual(
      {
        source: "z",
        independante: "d",
      },
    );
  });

  it("ne touche à rien quand la réponse est la même", () => {
    expect(withValidatedPage(PAGES, REPONSES, SOURCE, { source: "a" })).toEqual(
      REPONSES,
    );
  });

  it("retire la réponse d'une question que la page ne pose plus", () => {
    const { source: _retiree, ...sansSource } = REPONSES;
    expect(withValidatedPage(PAGES, REPONSES, SOURCE, {})).toEqual({
      independante: sansSource.independante,
    });
  });
});
