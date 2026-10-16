// Le retour vers un établissement pénitentiaire (option 10 de Q2.2.1.b) :
// TS1012-04 et `CONTRAT_CONTEXTES_V1012.json` du paquet v10.1.2 de l'éditeur.
// Les réponses qui qualifient le circuit sont notre lecture (D-118).

import { describe, expect, it } from "vitest";
import {
  CIRCUIT_PENITENTIAIRE,
  TRANSFERT_VERS_LA_PRISON,
} from "../../../front/models/eligibilite/retour-penitentiaire";
import { ciblesDe, validee } from "./reponses-de-la-permission";
import {
  faits,
  posee,
  type Reponses,
  TRAJET,
  valeurs,
} from "./reponses-du-transfert";

const AVEC_UN_PROFESSIONNEL: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
  "Q1.2": ["1_PAS_AUTONOME"],
  "Q1.3": ["7_AUCUNE"],
};
const RETOUR: Reponses = {
  "Q2.2.1": ["3_AUTRE_CADRE"],
  "Q2.2.1.b": ["10_RETOUR_PENITENTIAIRE"],
};
const SORTIE: Reponses = {
  ...AVEC_UN_PROFESSIONNEL,
  "Q2.1": "8_HOSPITALISATION",
  "Q2.1.g": "2_SORTIE",
  ...RETOUR,
};
const DE_LA_SORTIE = [
  "fait_hospitalisation",
  "fait_transfert_article80",
  "fait_centre15_interetablissements",
  "fait_permission",
] as const;

const incoherences = (page: string, id: keyof Reponses, reponses: Reponses) =>
  posee(page, id, reponses)?.inconsistencies ?? [];

describe("un mouvement administratif vers la prison", () => {
  it.each([
    [
      "sans professionnel (Q1.1)",
      {
        "Q0.1": "1_VERIFIER",
        "Q1.1": "1_SEUL",
        "Q1.3": ["7_AUCUNE"],
        "Q1.4": "1_VEHICULE_PERSONNEL",
        "Q2.1": "1_CONSULTATION",
      },
    ],
    ["sans soin (Q2.1)", { ...AVEC_UN_PROFESSIONNEL, "Q2.1": "15_AUCUN" }],
  ] as const)("%s s'arrête sur le circuit pénitentiaire", (_, avant) => {
    const reponses: Reponses = { ...avant, ...RETOUR };
    expect(incoherences("P2/contextes", "Q2.2.1.b", reponses)).toEqual([
      CIRCUIT_PENITENTIAIRE,
    ]);
    expect(validee("Q2.2.1.b", reponses)).toBe(false);
  });

  it("avec un soin et un professionnel, la prison n'est que l'adresse", () => {
    const reponses: Reponses = {
      ...AVEC_UN_PROFESSIONNEL,
      "Q2.1": "1_CONSULTATION",
      ...RETOUR,
    };
    expect(incoherences("P2/contextes", "Q2.2.1.b", reponses)).toEqual([]);
    expect(valeurs(reponses, DE_LA_SORTIE)).toEqual(
      valeurs({ ...reponses, "Q2.2.1": ["4_AUCUNE"] }, DE_LA_SORTIE),
    );
  });
});

describe("une sortie définitive vers la prison", () => {
  it("établit le séjour, sans transfert, Centre 15 ni permission", () => {
    expect(valeurs(SORTIE, DE_LA_SORTIE)).toEqual([true, false, false, false]);
  });

  it("ne pose pas Q2.5, même séjour coché et permission écartée", () => {
    const sejour: Reponses = {
      ...SORTIE,
      "Q2.2.1": ["1_HOSPITALISATION", "3_AUTRE_CADRE"],
      "Q2.2.1.a": "2_NON",
    };
    expect(posee("P2/transfert", "Q2.5", sejour)).toBeUndefined();
    expect(valeurs(sejour, DE_LA_SORTIE)).toEqual([true, false, false, false]);
    expect(
      posee("P2/transfert", "Q2.5", {
        ...sejour,
        "Q2.2.1": ["1_HOSPITALISATION"],
      }),
    ).toBeDefined();
  });

  it("laisse une permission à sa branche", () => {
    const permission: Reponses = {
      ...SORTIE,
      "Q2.2.1": ["1_HOSPITALISATION", "3_AUTRE_CADRE"],
      "Q2.2.1.a": "1_OUI",
    };
    expect(faits(permission).fait_permission.value).toBe(true);
  });

  it("laisse les règles calculer l'issue", () => {
    expect(ciblesDe({ ...SORTIE, ...TRAJET }).cible_issue_id).toBeDefined();
  });
});

describe("un transfert vers la prison", () => {
  const transfert = (deplacement: Reponses["Q2.5"]): Reponses => ({
    ...AVEC_UN_PROFESSIONNEL,
    "Q2.1": "9_TRANSFERT",
    ...RETOUR,
    ...TRAJET,
    "Q2.5": deplacement,
  });

  it("entre établissements, se refuse", () => {
    expect(
      incoherences("P2/transfert", "Q2.5", transfert("1_TRANSFERT")),
    ).toEqual([TRANSFERT_VERS_LA_PRISON]);
  });

  it("pendant l'hospitalisation, suit Q2.5 et Q2.6", () => {
    expect(
      incoherences("P2/transfert", "Q2.5", transfert("2_AUTRE_DEPLACEMENT")),
    ).toEqual([]);
  });
});
