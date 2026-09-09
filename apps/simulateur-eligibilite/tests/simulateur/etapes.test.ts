// La couture entre les étapes déclarées par le front et celles que le modèle
// nomme.
//
// `front/simulateur/questionnaire/etapes.ts` décide de l'ordre du parcours, en
// désignant les étapes par les identifiants du livrable (`Q1.1`, `A4.3`, `D7`…).
// Le modèle les porte de son côté, en `spec_id` sur chaque question. Les deux
// listes doivent se recouvrir exactement : une étape déclarée que le modèle ne
// connaît plus est un rang mort, et une question que le front ne sait pas placer
// n'a pas de page — elle irait en queue de parcours sans que rien ne le dise.
//
// C'est le premier test qui parle lors d'une montée de version : le modèle
// arrive avec ses étapes, et celles d'ici ne les recouvrent pas encore.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { ETAPES } from "../../front/simulateur/questionnaire/etapes.ts";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const regles = yaml.load(
  readFileSync(join(racine, "regles/regles.publicodes"), "utf-8"),
) as Record<string, { question?: string; spec_id?: string } | null>;

/** Les questions du modèle : celles qui portent un énoncé, donc un écran. */
const QUESTIONS_DU_MODELE = Object.entries(regles).filter(
  ([, corps]) => corps?.question !== undefined,
);

describe("les étapes du parcours et celles du modèle se recouvrent", () => {
  it("chaque question du modèle porte une étape", () => {
    const sansEtape = QUESTIONS_DU_MODELE.filter(
      ([, corps]) => corps?.spec_id === undefined,
    ).map(([cle]) => cle);
    expect(sansEtape).toEqual([]);
  });

  it("chaque question du modèle a son étape déclarée dans le parcours", () => {
    const declarees = new Set<string>(ETAPES);
    const inconnues = [
      ...new Set(
        QUESTIONS_DU_MODELE.map(([, corps]) => corps?.spec_id).filter(
          (etape) => etape !== undefined && !declarees.has(etape),
        ),
      ),
    ];
    expect(inconnues).toEqual([]);
  });

  it("chaque étape déclarée porte au moins une question du modèle", () => {
    const portees = new Set(
      QUESTIONS_DU_MODELE.map(([, corps]) => corps?.spec_id),
    );
    expect(ETAPES.filter((etape) => !portees.has(etape))).toEqual([]);
  });

  it("aucune étape n'est déclarée deux fois", () => {
    expect(new Set(ETAPES).size).toBe(ETAPES.length);
  });
});
