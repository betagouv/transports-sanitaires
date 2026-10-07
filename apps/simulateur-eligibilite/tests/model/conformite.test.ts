// La conformité du modèle livré : ce que le socle suppose de n'importe quel
// modèle, sans connaître ses questions.
//
// Le contrat `Model` est vérifié à la compilation. Ce fichier vérifie ce que les
// types ne disent pas. Chaque règle donne son pourquoi dans son message d'échec.

import { describe, expect, it } from "vitest";
import { model } from "../../front/model";
import { preconisationOf } from "../../front/socle/model";
import type { Page } from "../../front/socle/questionnaire-engine/question";
import { evaluateSeed } from "../../front/socle/seeds/seed";

const pages: readonly Page[] = [
  ...model.transportAndEligibility.parts.flatMap((part) => part.pages),
  ...model.cerfa.part.pages,
];
const questions = pages.flatMap((page) => page.questions);
const identifiants = questions.map((question) => question.id);

const doublons = (valeurs: readonly string[]) => [
  ...new Set(valeurs.filter((v, rang) => valeurs.indexOf(v) !== rang)),
];

describe("le questionnaire du modèle", () => {
  it("ne pose pas deux questions sous le même identifiant", () => {
    expect(
      doublons(identifiants),
      "Les réponses sont rangées par identifiant de question. Deux questions " +
        "de même identifiant s'écraseraient l'une l'autre, y compris de part " +
        "et d'autre du verrou.",
    ).toEqual([]);
  });

  it("ne nomme pas deux pages de la même façon", () => {
    expect(
      doublons(pages.map((page) => page.id)),
      "Le questionnaire retrouve sa page ouverte par son identifiant, au " +
        "retour d'un résultat comme à l'ouverture d'une seed. Deux pages de " +
        "même identifiant rouvriraient toujours la première.",
    ).toEqual([]);
  });

  it("ne fait dépendre une réponse que d'une question qui existe", () => {
    const orphelines = questions.flatMap((question) =>
      (question.dependsOn ?? [])
        .filter((id) => !identifiants.includes(id))
        .map((id) => `${question.id} → ${id}`),
    );
    expect(
      orphelines,
      "`dependsOn` efface une réponse quand celle dont elle dépend change. " +
        "Une dépendance vers une question absente ne s'effacera jamais : la " +
        "réponse survivra à ce qui devait l'invalider.",
    ).toEqual([]);
  });
});

describe("les seeds du modèle", async () => {
  const seeds = await model.seeds();

  it("portent chacune un identifiant qui leur est propre", () => {
    expect(
      doublons(seeds.map((seed) => seed.id)),
      "Les tests et la doc citent une seed par son identifiant.",
    ).toEqual([]);
  });

  it("ne répondent qu'à des questions du modèle", () => {
    const inconnues = seeds.flatMap((seed) =>
      Object.keys(seed.answers)
        .filter((id) => !identifiants.includes(id))
        .map((id) => `${seed.id} → ${id}`),
    );
    expect(
      inconnues,
      "Une réponse à une question disparue ne sert plus à rien, et laisse " +
        "croire que la seed couvre un cas qu'elle ne couvre plus.",
    ).toEqual([]);
  });

  it("sont rejouées sans écart avec leurs attendus", () => {
    const ecarts = seeds.flatMap((seed) =>
      evaluateSeed(
        (answers) => preconisationOf(model, answers).cibles,
        seed,
      ).mismatches.map(
        ({ cible, expected, actual }) =>
          `${seed.id} : ${cible} vaut ${String(actual)}, attendu ${String(expected)}`,
      ),
    );
    expect(
      ecarts,
      "Une seed est une situation de référence : son attendu fait foi. Un " +
        "écart veut dire que la préconisation a changé, ou que l'attendu " +
        "était faux. Dans les deux cas, il faut trancher, pas ajuster.",
    ).toEqual([]);
  });
});
