// Les contrôles de la page de la permission du mineur (Q2.8) : un message par
// incohérence, sur la plus tardive des deux questions, et le blocage de
// Q2.8.6.b. `CATALOGUE_COMPLET_QUESTIONS.md` Q2.8 du paquet de l'éditeur (D-107).
//
// Le jour 1 est la date d'hospitalisation, le 1er octobre : le 14e jour est le
// 14 octobre, à minuit.

import { describe, expect, it } from "vitest";
import { isAnswered } from "../../../front/socle/questionnaire-engine/offered-answer";
import {
  incoherences,
  MINEUR,
  PLUSIEURS_PERMISSIONS,
  posee,
  type Reponses,
  validee,
} from "./reponses-de-la-permission";

const AVANT_L_HOSPITALISATION =
  "La permission ne peut pas commencer avant le début de l’hospitalisation.";
const AVANT_LE_QUATORZIEME =
  "La première permission doit commencer au 14e jour d’hospitalisation ou après.";
const FIN_AVANT_LE_DEBUT =
  "La fin de la permission doit venir après son début.";
const PLUS_DE_48_HEURES = "Une permission dure au plus 48 heures.";
const PERIODE_TROP_COURTE =
  "La période ne peut pas se terminer avant la fin de la première permission.";

const debut = (valeur: string): Reponses => ({ ...MINEUR, "Q2.8.2": valeur });
const permission = (de: string, a: string): Reponses => ({
  ...MINEUR,
  "Q2.8.2": de,
  "Q2.8.3": a,
});
const periode = (fin: string): Reponses => ({
  ...PLUSIEURS_PERMISSIONS,
  "Q2.8.6": fin,
});

describe("le début de la première permission (Q2.8.2)", () => {
  it("avant l'hospitalisation, bloque deux fois : le début et le 14e jour", () => {
    const reponses = debut("2026-09-30T23:59");
    expect(incoherences("Q2.8.2", reponses)).toEqual([
      AVANT_L_HOSPITALISATION,
      AVANT_LE_QUATORZIEME,
    ]);
    expect(validee("Q2.8.2", reponses)).toBe(false);
  });

  it("le jour de l'hospitalisation, bloque encore le 14e jour", () => {
    expect(incoherences("Q2.8.2", debut("2026-10-01T08:00"))).toEqual([
      AVANT_LE_QUATORZIEME,
    ]);
  });

  it("la veille du 14e jour, à 23 h 59, bloque", () => {
    const reponses = debut("2026-10-13T23:59");
    expect(incoherences("Q2.8.2", reponses)).toEqual([AVANT_LE_QUATORZIEME]);
    expect(validee("Q2.8.4", reponses)).toBe(false);
  });

  it("le 14e jour à minuit pile est accepté", () => {
    const reponses = debut("2026-10-14T00:00");
    expect(incoherences("Q2.8.2", reponses)).toEqual([]);
    expect(validee("Q2.8.2", reponses)).toBe(true);
  });

  it("ne dit rien tant que la date d'hospitalisation manque", () => {
    const { "Q2.8.1": _, ...sansDate } = MINEUR;
    expect(incoherences("Q2.8.2", sansDate)).toEqual([]);
  });
});

describe("la fin de la première permission (Q2.8.3)", () => {
  it.each([
    ["avant son début", "2026-10-14T09:00", "2026-10-14T08:59"],
    ["en même temps que son début", "2026-10-14T09:00", "2026-10-14T09:00"],
  ])("%s, bloque", (_, de, a) => {
    expect(incoherences("Q2.8.3", permission(de, a))).toEqual([
      FIN_AVANT_LE_DEBUT,
    ]);
  });

  it("48 heures pile sont acceptées", () => {
    const reponses = permission("2026-10-14T09:00", "2026-10-16T09:00");
    expect(incoherences("Q2.8.3", reponses)).toEqual([]);
    expect(validee("Q2.8.3", reponses)).toBe(true);
  });

  it("48 heures et une minute bloquent", () => {
    const reponses = permission("2026-10-14T09:00", "2026-10-16T09:01");
    expect(incoherences("Q2.8.3", reponses)).toEqual([PLUS_DE_48_HEURES]);
    expect(validee("Q2.8.3", reponses)).toBe(false);
  });
});

describe("la fin de la période (Q2.8.6)", () => {
  it("avant la fin de la première permission, bloque", () => {
    const reponses = periode("2026-10-14");
    expect(incoherences("Q2.8.6", reponses)).toEqual([PERIODE_TROP_COURTE]);
    expect(validee("Q2.8.6", reponses)).toBe(false);
  });

  it("le jour de la fin de la première permission est accepté", () => {
    expect(incoherences("Q2.8.6", periode("2026-10-15"))).toEqual([]);
  });

  it("ne bloque pas une période sans date", () => {
    const { "Q2.8.6": _, ...sansFin } = PLUSIEURS_PERMISSIONS;
    expect(incoherences("Q2.8.6", sansFin)).toEqual([]);
  });
});

describe("la période et sa fréquence (Q2.8.5 = Oui)", () => {
  it("révèle les trois champs de la période, et eux seuls", () => {
    const champs = ["Q2.8.6", "Q2.8.6.a", "Q2.8.6.b"] as const;
    for (const id of champs) {
      expect(posee("P2/permission-mineur", id, MINEUR)).toBeUndefined();
      expect(
        posee("P2/permission-mineur", id, PLUSIEURS_PERMISSIONS),
      ).toBeDefined();
    }
  });

  it("demande un entier d'au moins une semaine", () => {
    const frequence = posee(
      "P2/permission-mineur",
      "Q2.8.6.a",
      PLUSIEURS_PERMISSIONS,
    );
    expect(frequence).toMatchObject({
      kind: "number",
      integer: true,
      min: 1,
      unit: "semaine(s)",
    });
    expect(frequence && isAnswered(frequence, 1)).toBe(true);
    expect(frequence && isAnswered(frequence, 0)).toBe(false);
    expect(frequence && isAnswered(frequence, 1.5)).toBe(false);
  });

  it("Q2.8.6.b « Oui » valide la page", () => {
    expect(validee("Q2.8.6.b", PLUSIEURS_PERMISSIONS)).toBe(true);
  });

  it("Q2.8.6.b « Non » bloque Suivant, et dit de raccourcir la période", () => {
    const reponses: Reponses = {
      ...PLUSIEURS_PERMISSIONS,
      "Q2.8.6.b": "2_NON",
    };
    const question = posee("P2/permission-mineur", "Q2.8.6.b", reponses);
    expect(question?.kind).toBe("single choice");
    expect(
      question?.kind === "single choice" &&
        question.options.find(({ value }) => value === "2_NON")?.blocks,
    ).toBe(
      "La période doit se terminer avant le vingtième anniversaire du patient. Raccourcissez-la, puis faites une autre simulation pour la période suivante.",
    );
    expect(question && isAnswered(question, "2_NON")).toBe(false);
    expect(validee("Q2.8.6.b", reponses)).toBe(false);
  });
});
