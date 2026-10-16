// Les faits que la page de la prestation établit, à trois états : « oui »,
// « non », ou absent (D-77). `CONTRAT_REPONSES_FAITS.json` et son correctif
// disent ce qui donne chaque état.

import { describe, expect, it } from "vitest";
import { model } from "../../../front/models/eligibilite";
import type { Faits } from "../../../front/models/eligibilite/declarations/faits";
import type { Questions } from "../../../front/models/eligibilite/declarations/questions";
import { preconisationOf } from "../../../front/socle/model";
import type { Answers } from "../../../front/socle/questionnaire-engine/question";

type Reponses = Answers<Questions>;

const valeur = (fait: keyof Faits, reponses: Reponses) =>
  (preconisationOf(model, reponses).faits as Faits)[fait].value;

const SEUL: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "1_SEUL",
  "Q1.3": ["7_AUCUNE"],
  "Q1.4": "1_VEHICULE_PERSONNEL",
};
const motif = (q21: Questions["Q2.1"], autres: Reponses = {}): Reponses => ({
  ...SEUL,
  "Q2.1": q21,
  ...autres,
});

describe("la permission", () => {
  it.each([
    ["Q2.1 = permission", motif("11_PERMISSION"), true],
    [
      "un autre motif, Q2.2.1 encore à venir",
      motif("1_CONSULTATION"),
      undefined,
    ],
  ] as const)("%s", (_, reponses, attendu) => {
    expect(valeur("fait_permission", reponses)).toBe(attendu);
  });
});

describe("l'événement sans soin", () => {
  it.each([
    ["une consultation, un soin ordinaire", motif("1_CONSULTATION"), false],
    [
      "une hospitalisation",
      motif("8_HOSPITALISATION", { "Q2.1.g": "1_ENTREE" }),
      false,
    ],
    [
      "une convocation, à qualifier en Q2.10",
      motif("12_CONVOCATION"),
      undefined,
    ],
    ["aucun de ces soins ou événements", motif("15_AUCUN"), undefined],
    ["Q2.1 pas encore validée", SEUL, undefined],
  ] as const)("%s", (_, reponses, attendu) => {
    expect(valeur("fait_evenement_sans_soin", reponses)).toBe(attendu);
  });
});

describe("le CAMSP", () => {
  it.each([
    ["séance dans le parcours", motif("10_CAMSP", { "Q2.1.h": "1_OUI" }), true],
    [
      "séance hors du parcours",
      motif("10_CAMSP", { "Q2.1.h": "2_NON" }),
      false,
    ],
    [
      "rattachement inconnu",
      motif("10_CAMSP", { "Q2.1.h": "3_NE_SAIT_PAS" }),
      undefined,
    ],
    ["un autre motif", motif("1_CONSULTATION"), undefined],
  ] as const)("%s", (_, reponses, attendu) => {
    expect(valeur("fait_motif_camsp", reponses)).toBe(attendu);
  });
});

describe("l'hospitalisation", () => {
  it.each([
    ["une entrée", "1_ENTREE", true, true],
    ["une sortie", "2_SORTIE", true, true],
    ["une admission en HAD à domicile", "3_ADMISSION_HAD", undefined, false],
  ] as const)("%s", (_, sousType, hospitalisation, soins) => {
    const reponses = motif("8_HOSPITALISATION", { "Q2.1.g": sousType });
    expect(valeur("fait_hospitalisation", reponses)).toBe(hospitalisation);
    expect(valeur("fait_situation_soins_qualifiante", reponses)).toBe(soins);
  });

  it("une consultation, « déjà hospitalisé » écarté : ni séjour, ni soin qualifiant", () => {
    const reponses = motif("1_CONSULTATION", { "Q2.2.1": ["4_AUCUNE"] });
    expect(valeur("fait_hospitalisation", reponses)).toBe(false);
    expect(valeur("fait_situation_soins_qualifiante", reponses)).toBe(false);
  });

  it("garde celle que P1 prouve par une séance", () => {
    const chimio: Reponses = {
      "Q0.1": "1_VERIFIER",
      "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
      "Q1.2": ["1_PAS_AUTONOME"],
      "Q1.3": ["3_CHIMIOTHERAPIE"],
    };
    expect(valeur("fait_hospitalisation", chimio)).toBe(true);
  });
});
