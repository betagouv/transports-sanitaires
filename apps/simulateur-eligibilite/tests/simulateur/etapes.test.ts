// La couture entre les étapes déclarées par le front et les questions du modèle.
//
// `front/simulateur/questionnaire/etapes.ts` recopie les étapes du contrat
// d'interface : leur ordre, et les règles que chacune pose. Le modèle, lui, ne
// dit plus à quelle étape appartient une question — il portait un `spec_id`
// jusqu'en v9.5.1, il n'en porte plus. Les deux listes ne se rejoignent donc
// nulle part ailleurs qu'ici.
//
// Le risque est des deux côtés. Une étape qui pose une règle absente du modèle
// fait une page vide ; une question du modèle qu'aucune étape ne porte n'a pas de
// rang, donc pas de place — elle irait en queue de parcours sans que rien ne le
// dise. C'est le premier test qui parle lors d'une montée de version.

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";
import { ENTREES_CALCULEES } from "../../front/simulateur/contrat-regles-publicodes.ts";
import { ETAPES } from "../../front/simulateur/questionnaire/etapes.ts";

const racine = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const regles = yaml.load(
  readFileSync(join(racine, "regles/regles.publicodes"), "utf-8"),
) as Record<
  string,
  { question?: string; mosaique?: unknown; "applicable si"?: unknown } | null
>;

/**
 * Les questions du modèle : celles qui portent un énoncé, donc un écran. Les
 * règles parentes des mosaïques n'en sont pas — elles portent l'énoncé du groupe
 * et rien à répondre, ce sont leurs options que l'étape pose. Une règle retirée
 * (`applicable si: non`) non plus : elle garde son énoncé pour mémoire, mais ne
 * s'affichera jamais.
 */
const QUESTIONS_DU_MODELE = Object.entries(regles)
  .filter(([, corps]) => corps?.question !== undefined)
  .filter(([, corps]) => corps?.mosaique === undefined)
  .filter(([, corps]) => corps?.["applicable si"] !== "non")
  .map(([cle]) => cle);

/** Les règles que le parcours pose, toutes étapes confondues. */
const CHAMPS_DES_ETAPES = ETAPES.flatMap((etape) => etape.champs);

describe("les étapes du parcours et les questions du modèle se recouvrent", () => {
  it("chaque question posée par une étape existe dans le modèle", () => {
    expect(CHAMPS_DES_ETAPES.filter((champ) => !(champ in regles))).toEqual([]);
  });

  it("chaque question du prescripteur est posée par une étape", () => {
    const orphelines = QUESTIONS_DU_MODELE.filter(
      (champ) => !CHAMPS_DES_ETAPES.includes(champ as never),
    );
    expect(orphelines).toEqual([]);
  });

  it("aucune entrée calculée par l'application n'est posée au prescripteur", () => {
    // Le modèle les distingue en ne leur donnant pas d'énoncé. Si l'une venait à
    // en recevoir un, elle deviendrait une question sans cesser d'être un calcul.
    const posees = ENTREES_CALCULEES.filter((champ) =>
      CHAMPS_DES_ETAPES.includes(champ as never),
    );
    expect(posees).toEqual([]);
  });

  it("aucune règle n'est posée par deux étapes", () => {
    expect(new Set(CHAMPS_DES_ETAPES).size).toBe(CHAMPS_DES_ETAPES.length);
  });

  it("aucune étape n'est déclarée deux fois", () => {
    const ids = ETAPES.map((etape) => etape.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("chaque règle de complétude existe dans le modèle", () => {
    const completudes = ETAPES.map((etape) => etape.complet).filter(
      (regle) => regle !== undefined,
    );
    expect(completudes.filter((regle) => !(regle in regles))).toEqual([]);
  });
});
