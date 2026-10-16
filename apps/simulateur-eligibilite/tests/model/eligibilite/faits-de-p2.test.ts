// Les faits que P2 établit, chacun à trois états : « oui », « non », ou
// absent, et alors jamais transmis aux règles (D-77).
//
// `CONTRAT_REPONSES_FAITS.json` dit, fait par fait, ce qui donne chaque état.
// Seule la page du trajet est posée : les autres faits de P2 restent absents.

import { describe, expect, it } from "vitest";
import { model } from "../../../front/models/eligibilite";
import type { Cibles } from "../../../front/models/eligibilite/declarations/cibles";
import type { Faits } from "../../../front/models/eligibilite/declarations/faits";
import type { Questions } from "../../../front/models/eligibilite/declarations/questions";
import { preconisationOf } from "../../../front/socle/model";
import type { Answers } from "../../../front/socle/questionnaire-engine/question";

type Reponses = Answers<Questions>;

const valeur = (fait: keyof Faits, reponses: Reponses) =>
  (preconisationOf(model, reponses).faits as Faits)[fait].value;
const cible = (nom: keyof Cibles, reponses: Reponses) =>
  (preconisationOf(model, reponses).cibles as Cibles)[nom];

const BRANCARD: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
  "Q1.2": ["8_BRANCARDAGE"],
  "Q1.3": ["7_AUCUNE"],
  "Q2.2.1": ["4_AUCUNE"],
};
const COURT: Reponses = {
  ...BRANCARD,
  "Q2.3.1": "1_CINQUANTE_KM_OU_MOINS",
  "Q2.3.2": false,
};
const MOYEN: Reponses = {
  ...BRANCARD,
  "Q2.3.1": "2_PLUS_DE_CINQUANTE_KM",
  "Q2.3.2": false,
};
const LONG: Reponses = {
  ...BRANCARD,
  "Q2.3.1": "3_PLUS_DE_CENT_CINQUANTE_KM",
  "Q2.3.2": false,
};

describe("la distance (Q2.3.1)", () => {
  it.each([
    ["fait_distance_plus_50", COURT, false],
    ["fait_distance_plus_50", MOYEN, true],
    ["fait_distance_plus_50", LONG, true],
    ["fait_distance_plus_150", COURT, false],
    ["fait_distance_plus_150", MOYEN, false],
    ["fait_distance_plus_150", LONG, true],
    ["fait_distance_plus_50", BRANCARD, undefined],
    ["fait_distance_plus_150", BRANCARD, undefined],
  ] as const)("%s, %#", (fait, reponses, attendu) => {
    expect(valeur(fait, reponses)).toBe(attendu);
  });

  it("reste absente tant que P1 n'est pas validée", () => {
    const { "Q1.3": _, ...sansQ13 } = LONG;
    expect(valeur("fait_distance_plus_150", sansQ13)).toBeUndefined();
  });

  it("donne aux règles le motif de demande d'accord au-delà de 150 km", () => {
    expect(cible("cible_dap_motif_longue_distance", LONG)).toBe(true);
    expect(cible("cible_dap_motif_longue_distance", MOYEN)).toBe(false);
  });
});

describe("la série (Q2.3.3)", () => {
  it.each([
    ["« Oui »", { ...MOYEN, "Q2.3.3": "1_OUI" }, true],
    ["« Non »", { ...MOYEN, "Q2.3.3": "2_NON" }, false],
    ["une réponse qui attend", MOYEN, undefined],
    ["un trajet de 50 km ou moins", COURT, undefined],
    [
      "une réponse restée d'un trajet plus long",
      { ...COURT, "Q2.3.3": "1_OUI" },
      undefined,
    ],
  ] as const)("%s", (_, reponses, attendu) => {
    expect(valeur("fait_serie_qualifiante", reponses)).toBe(attendu);
  });

  it("fait la série des règles avec la distance", () => {
    expect(cible("cible_serie", { ...MOYEN, "Q2.3.3": "1_OUI" })).toBe(true);
    expect(cible("cible_serie", COURT)).toBe(false);
  });
});

describe("P2", () => {
  it("reste absente tant que ses pages ne sont pas toutes validées (fin-de-p2.test.ts)", () => {
    expect(
      valeur("fait_p2_complete", { ...LONG, "Q2.3.3": "1_OUI" }),
    ).toBeUndefined();
  });
});

describe("l'avion ou le bateau (Q2.3.2)", () => {
  it.each([
    ["case cochée", { ...COURT, "Q2.3.2": true }, true],
    ["case décochée", COURT, false],
    ["page pas encore validée", BRANCARD, undefined],
  ] as const)("%s", (_, reponses, attendu) => {
    expect(valeur("fait_avion_bateau_ligne", reponses)).toBe(attendu);
  });

  it("donne aux règles le motif de demande d'accord, même sur un trajet court", () => {
    expect(
      cible("cible_dap_motif_avion_bateau", { ...COURT, "Q2.3.2": true }),
    ).toBe(true);
  });
});

describe("l'urgence (Q2.3.4)", () => {
  const SERIE = { ...LONG, "Q2.3.3": "1_OUI" } as const;

  it.each([
    ["« Oui »", { ...SERIE, "Q2.3.4": "1_OUI" }, true, true],
    ["« Non »", { ...SERIE, "Q2.3.4": "2_NON" }, false, true],
    ["une réponse qui attend", SERIE, undefined, undefined],
    ["un trajet sans demande d'accord", COURT, undefined, undefined],
    [
      "une réponse restée d'un trajet sans demande d'accord",
      { ...COURT, "Q2.3.4": "1_OUI" },
      undefined,
      undefined,
    ],
  ] as const)("%s", (_, reponses, attestee, repondue) => {
    expect(valeur("fait_urgence_attestee", reponses)).toBe(attestee);
    expect(valeur("fait_urgence_repondue", reponses)).toBe(repondue);
  });

  it("donne aux règles l'urgence attestée", () => {
    expect(
      cible("cible_urgence_attestee", { ...SERIE, "Q2.3.4": "1_OUI" }),
    ).toBe(true);
  });
});
