// Les situations particulières du trajet (Q2.2.1) et leurs précisions :
// `CONTRAT_Q221_PROGRESSIF.json`, `CONTRAT_CONTEXTES_DECISIFS.md` et
// `CONTRAT_NEGATIONS_PROUVEES.json` du paquet de l'éditeur.
//
// Une situation proposée et écartée vaut « non ». Une situation qui ne se
// propose pas garde son fait absent, et un groupe coché n'établit rien avant
// sa précision.

import { describe, expect, it } from "vitest";
import { model } from "../../../front/models/eligibilite";
import type { Faits } from "../../../front/models/eligibilite/declarations/faits";
import type { Questions } from "../../../front/models/eligibilite/declarations/questions";
import { preconisationOf } from "../../../front/socle/model";
import { askedQuestions } from "../../../front/socle/questionnaire-engine/asked-questions";
import {
  type Answers,
  pagesOf,
} from "../../../front/socle/questionnaire-engine/question";

type Reponses = Answers<Questions>;

const pages = pagesOf(model.transportAndEligibility.parts);
const page = pages.find(({ id }) => id === "P2/contextes");
const posee = (id: keyof Questions, reponses: Reponses) => {
  const question = (page ? askedQuestions(pages, page, reponses) : []).find(
    (candidate) => candidate.id === id,
  );
  return question?.kind === "multiple choice" ? question : undefined;
};
const proposees = (id: keyof Questions, reponses: Reponses) =>
  posee(id, reponses)?.options.map(({ value }) => value);
const faits = (reponses: Reponses) =>
  preconisationOf(model, reponses).faits as Faits;
const valeurs = (reponses: Reponses, noms: readonly (keyof Faits)[]) =>
  noms.map((nom) => faits(reponses)[nom].value);

const BRANCARD: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
  "Q1.2": ["8_BRANCARDAGE"],
  "Q1.3": ["7_AUCUNE"],
};
const CONSULTATION: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "1_SEUL",
  "Q1.3": ["7_AUCUNE"],
  "Q1.4": "1_VEHICULE_PERSONNEL",
  "Q2.1": "1_CONSULTATION",
};

const DU_SEJOUR = [
  "fait_transfert_article80",
  "fait_centre15_interetablissements",
  "fait_permission",
  "fait_permission_charge_patient",
  "fait_permission_mineur_admissible",
] as const;
const DU_CADRE = [
  "fait_atmp_lie",
  "fait_dap_maternite",
  "fait_htnm_hors_maternite",
  "fait_motif_camsp",
  "fait_motif_samsah",
  "fait_centre_reference_destination",
  "fait_motif_pension",
  "fait_convocation",
] as const;

describe("Q2.2.1 « Aucune »", () => {
  const aucune = { ...BRANCARD, "Q2.2.1": ["4_AUCUNE"] } satisfies Reponses;

  it("écarte chaque situation proposée", () => {
    expect(
      valeurs(aucune, [...DU_SEJOUR, ...DU_CADRE, "fait_trajet_etranger"]),
    ).toEqual(Array(14).fill(false));
  });

  it("n'établit pas l'hospitalisation, que Q2.2.1 ne demande pas", () => {
    expect(faits(aucune).fait_hospitalisation.value).toBeUndefined();
  });

  it("un formulaire vide n'est pas « Aucune »", () => {
    expect(valeurs({ ...BRANCARD, "Q2.2.1": [] }, DU_CADRE)).toEqual(
      Array(8).fill(undefined),
    );
  });
});

describe("l'autre cadre (Q2.2.1.b)", () => {
  const cadre = (precision: Questions["Q2.2.1.b"]): Reponses => ({
    ...BRANCARD,
    "Q2.2.1": ["3_AUTRE_CADRE"],
    "Q2.2.1.b": precision,
  });

  it("coché, attend sa précision avant d'établir quoi que ce soit", () => {
    expect(valeurs(cadre([]), DU_CADRE)).toEqual(Array(8).fill(undefined));
  });

  it("met à « oui » la situation cochée, à « non » celles écartées", () => {
    expect(valeurs(cadre(["1_ATMP"]), DU_CADRE)).toEqual([
      true,
      ...Array(7).fill(false),
    ]);
  });

  it.each([
    ["6_CAMSP", "fait_motif_camsp"],
    ["7_SAMSAH", "fait_motif_samsah"],
    ["9_PENSION_MILITAIRE", "fait_motif_pension"],
  ] as const)("%s donne %s", (contexte, fait) => {
    expect(faits(cadre([contexte]))[fait].value).toBe(true);
  });

  it.each([
    ["4_MATERNITE_ELOIGNEE", "fait_dap_maternite"],
    ["5_HTNM", "fait_htnm_hors_maternite"],
    ["8_CENTRE_DE_REFERENCE", "fait_centre_reference_destination"],
    ["13_CONVOCATION", "fait_convocation"],
  ] as const)("%s laisse %s à qualifier dans sa branche", (contexte, fait) => {
    expect(faits(cadre([contexte]))[fait]).toEqual({
      provenance: expect.stringMatching(/À qualifier dans sa branche/),
    });
  });

  it("refuse ensemble la maternité et l'HTNM, le CAMSP et le SAMSAH", () => {
    expect(
      posee("Q2.2.1.b", cadre([]))?.incompatibleOptions?.map(
        ({ values }) => values,
      ),
    ).toEqual([
      ["4_MATERNITE_ELOIGNEE", "5_HTNM"],
      ["6_CAMSP", "7_SAMSAH"],
    ]);
  });

  it("montre dans l'aide de Q2.2.1 les situations qu'elle propose", () => {
    const aide = posee("Q2.2.1", BRANCARD)?.options.find(
      ({ value }) => value === "3_AUTRE_CADRE",
    )?.help;
    expect(aide?.label).toBe("Voir les situations concernées");
    expect(aide?.items).toHaveLength(9);
  });
});

describe("le séjour en cours (Q2.2.1.a)", () => {
  const sejour = (permission: Questions["Q2.2.1.a"]): Reponses => ({
    ...BRANCARD,
    "Q2.2.1": ["1_HOSPITALISATION"],
    "Q2.2.1.a": permission,
  });

  it("« Oui » établit la permission, sans rien dire du transfert", () => {
    expect(valeurs(sejour("1_OUI"), DU_SEJOUR)).toEqual([
      undefined,
      undefined,
      true,
      undefined,
      undefined,
    ]);
  });

  it("« Non » écarte la permission, sa charge et la règle du mineur", () => {
    expect(valeurs(sejour("2_NON"), DU_SEJOUR)).toEqual([
      undefined,
      undefined,
      false,
      false,
      false,
    ]);
  });
});

describe("l'étranger (Q2.2.5)", () => {
  const etranger = (lieux: Questions["Q2.2.5"]): Reponses => ({
    ...BRANCARD,
    "Q2.2.1": ["2_ETRANGER"],
    "Q2.2.5": lieux,
  });

  it.each([
    [["1_DEPART"], true],
    [["2_ARRIVEE", "3_LIEU_DES_SOINS"], true],
    [["3_LIEU_DES_SOINS"], false],
  ] as const)("%j : fait_trajet_etranger vaut %s", (lieux, attendu) => {
    expect(faits(etranger(lieux)).fait_trajet_etranger.value).toBe(attendu);
  });
});

describe("ce que Q2.1 indique déjà (D-98)", () => {
  const avec = (reponses: Reponses): Reponses => ({
    ...CONSULTATION,
    ...reponses,
    "Q2.2.1": ["4_AUCUNE"],
  });

  it("une permission retire le séjour : ses faits restent absents", () => {
    const permission = avec({ "Q2.1": "11_PERMISSION" });
    expect(proposees("Q2.2.1", permission)).not.toContain("1_HOSPITALISATION");
    expect(valeurs(permission, DU_SEJOUR)).toEqual([
      undefined,
      undefined,
      true,
      undefined,
      undefined,
    ]);
  });

  it("une permission se rappelle, et « Aucune » dit « autre »", () => {
    const question = posee("Q2.2.1", avec({ "Q2.1": "11_PERMISSION" }));
    expect(question?.reminder).toBe(
      "Déjà indiqué : Permission temporaire pendant l’hospitalisation.",
    );
    expect(question?.exclusiveOption?.label).toBe(
      "Aucune autre situation parmi celles proposées.",
    );
  });

  it("une entrée en hospitalisation retire le séjour", () => {
    const entree = avec({ "Q2.1": "8_HOSPITALISATION", "Q2.1.g": "1_ENTREE" });
    expect(proposees("Q2.2.1", entree)).not.toContain("1_HOSPITALISATION");
    expect(faits(entree).fait_transfert_article80.value).toBeUndefined();
  });

  it.each([
    ["10_CAMSP", ["6_CAMSP"]],
    ["12_CONVOCATION", ["13_CONVOCATION"]],
    ["13_MATERNITE", ["4_MATERNITE_ELOIGNEE", "5_HTNM"]],
  ] as const)("%s retire %j de l'autre cadre", (motif, retires) => {
    const reponses = {
      ...avec({ "Q2.1": motif, "Q2.1.h": "1_OUI" }),
      "Q2.2.1": ["3_AUTRE_CADRE"],
    } satisfies Reponses;
    const offertes = proposees("Q2.2.1.b", reponses);
    expect(offertes).toHaveLength(9 - retires.length);
    for (const retire of retires) expect(offertes).not.toContain(retire);
  });

  it("« Aucune » ne touche pas au CAMSP prouvé en Q2.1.h", () => {
    const camsp = avec({ "Q2.1": "10_CAMSP", "Q2.1.h": "1_OUI" });
    expect(faits(camsp).fait_motif_camsp.value).toBe(true);
  });

  it("« Aucune » laisse absente la maternité indiquée en Q2.1", () => {
    const maternite = avec({ "Q2.1": "13_MATERNITE" });
    expect(
      valeurs(maternite, ["fait_dap_maternite", "fait_htnm_hors_maternite"]),
    ).toEqual([undefined, undefined]);
  });
});
