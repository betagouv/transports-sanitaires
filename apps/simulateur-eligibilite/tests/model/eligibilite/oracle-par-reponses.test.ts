// L'oracle de l'éditeur, rejoué par les réponses : les cas de `oracle.test.ts`
// que le questionnaire sait produire, sans fait forcé (D-110). Chaque parcours
// part d'un brancard à 20 km, ou d'un patient seul, et ne change que ce que le
// cas change.
//
// Les cas ne se rejouent pas tous. L'oracle pose des faits que nos questions ne
// posent pas : une ALD exonérante inconnue, la correspondance univoque, le
// régime, l'exclusion du soin, la reconnaissance du mineur. Ceux-là restent
// rejoués en faits dans `oracle.test.ts`.

import { describe, expect, it } from "vitest";
import {
  BRANCARD_20_KM,
  ciblesDe,
  MATERNITE,
  type Reponses,
} from "./reponses-de-la-branche";
import { PAR_Q21 } from "./reponses-de-la-convocation";
import { definitif } from "./reponses-du-transfert";

const LONGUE = {
  ...BRANCARD_20_KM,
  "Q2.3.1": "3_PLUS_DE_CENT_CINQUANTE_KM",
  "Q2.3.3": "2_NON",
} as const;

const SERIE = {
  ...BRANCARD_20_KM,
  "Q2.3.1": "2_PLUS_DE_CINQUANTE_KM",
  "Q2.3.3": "1_OUI",
} as const;

const autreCadre = (base: Reponses, ...situations: string[]): Reponses =>
  ({
    ...base,
    "Q2.2.1": ["3_AUTRE_CADRE"],
    "Q2.2.1.b": situations,
  }) as Reponses;

const CAS: readonly [ids: string, reponses: Reponses, issue: string][] = [
  ["D01 D31", BRANCARD_20_KM, "ISSUE_PMT"],
  ["D08", { ...SERIE, "Q2.3.4": "2_NON" }, "ISSUE_DAP_SANS_URGENCE"],
  ["D09", { ...SERIE, "Q2.3.4": "1_OUI" }, "ISSUE_DAP_URGENCE_ATTESTEE"],
  ["D12", { ...LONGUE, "Q2.3.4": "2_NON" }, "ISSUE_DAP_SANS_URGENCE"],
  ["D13", { ...LONGUE, "Q2.3.4": "1_OUI" }, "ISSUE_DAP_URGENCE_ATTESTEE"],
  ["D14 D45", definitif(["11_AUCUNE"]), "ISSUE_ETABLISSEMENT"],
  ["D15", definitif(["3_CENTRE_QUINZE"]), "ISSUE_CAISSE"],
  [
    "D18",
    {
      ...autreCadre(BRANCARD_20_KM, "5_HTNM"),
      "Q2.14.2": "2_HORS_ENGAGEMENT",
    },
    "ISSUE_CAISSE",
  ],
  [
    "D19",
    { ...MATERNITE, "Q2.14.1": "1_OUI", "Q2.12": "2_NON" },
    "ISSUE_DAP_SANS_URGENCE",
  ],
  [
    "D20",
    { ...MATERNITE, "Q2.14.1": "1_OUI", "Q2.12": "1_OUI" },
    "ISSUE_CAISSE",
  ],
  ["D30", { ...PAR_Q21, "Q2.10": "1_CONTROLE_MEDICAL" }, "ISSUE_CONVOCATION"],
  [
    "D35",
    {
      ...autreCadre(LONGUE, "1_ATMP"),
      "Q2.3.4": "2_NON",
    },
    "ISSUE_DAP_SANS_URGENCE",
  ],
  [
    "D37",
    {
      ...autreCadre(LONGUE, "1_ATMP"),
      "Q2.3.4": "1_OUI",
    },
    "ISSUE_DAP_URGENCE_ATTESTEE",
  ],
  ["D48", autreCadre(BRANCARD_20_KM, "7_SAMSAH"), "ISSUE_CAISSE"],
  ["D49", autreCadre(BRANCARD_20_KM, "9_PENSION_MILITAIRE"), "ISSUE_CAISSE"],
];

describe("l'oracle de l'éditeur, par les réponses", () => {
  it.each(CAS)("%s", (_ids, reponses, issue) => {
    expect(ciblesDe(reponses).cible_issue_id).toBe(issue);
  });
});
