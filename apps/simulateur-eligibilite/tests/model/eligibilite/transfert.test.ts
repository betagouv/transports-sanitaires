// Le transfert (Q2.5) : quand la page se pose, ce qu'elle établit, et
// l'ouverture directe de Q2.6 par une admission en HAD. `CONTRAT_REPONSES_FAITS.json`,
// `CONTRAT_NEGATIONS_PROUVEES.json` et le scénario `article80-bilan-complet`
// de `tests/test_cinq_retours_a.mjs` du paquet de l'éditeur (D-106).

import { describe, expect, it } from "vitest";
import {
  cible,
  cibles,
} from "../../../front/models/eligibilite/evaluation-des-regles";
import {
  definitif,
  EXCEPTIONS,
  faits,
  HAD_A_DOMICILE,
  posee,
  proposees,
  SEJOUR,
  URGENCES,
  valeurs,
} from "./reponses-du-transfert";

describe("article80-bilan-complet", () => {
  const bilan = definitif(["11_AUCUNE"]);

  it("un transfert définitif sans exception : ISSUE_ETABLISSEMENT", () => {
    expect(cibles(faits(bilan)).cible_issue_id).toBe("ISSUE_ETABLISSEMENT");
  });

  it("établit le transfert, le séjour et le Centre 15 écarté", () => {
    expect(
      valeurs(bilan, [
        "fait_transfert_article80",
        "fait_hospitalisation",
        "fait_centre15_interetablissements",
        "fait_appel_centre15",
      ]),
    ).toEqual([true, true, false, false]);
  });

  it("définit les huit exceptions, toutes à « non »", () => {
    expect(valeurs(bilan, EXCEPTIONS)).toEqual(Array(8).fill(false));
    expect(cible(faits(bilan), "cible_exception_article80")).toBe(false);
  });
});

describe("Q2.6 non posée", () => {
  it.each([
    ["Q2.2.1 « Aucune »", { ...SEJOUR, "Q2.2.1": ["4_AUCUNE"] }],
    ["Q2.5 sans réponse", { ...URGENCES }],
  ] as const)("%s : les huit exceptions restent absentes", (_, reponses) => {
    expect(posee("P2/exceptions", "Q2.6", reponses)).toBeUndefined();
    expect(valeurs(reponses, EXCEPTIONS)).toEqual(Array(8).fill(undefined));
  });

  it("Q2.5 ne se pose pas sans transfert ni déplacement hospitalier", () => {
    const sansSejour = { ...SEJOUR, "Q2.2.1": ["4_AUCUNE"] } as const;
    expect(posee("P2/transfert", "Q2.5", sansSejour)).toBeUndefined();
    expect(posee("P2/transfert", "Q2.5", SEJOUR)).toBeDefined();
    expect(posee("P2/transfert", "Q2.5", URGENCES)).toBeDefined();
  });

  it("une permission ne pose pas Q2.5", () => {
    const permission = { ...SEJOUR, "Q2.2.1.a": "1_OUI" } as const;
    expect(posee("P2/transfert", "Q2.5", permission)).toBeUndefined();
  });
});

describe("Q2.5 « Non » seule", () => {
  const autre = { ...SEJOUR, "Q2.5": "2_AUTRE_DEPLACEMENT" } as const;

  it("n'établit pas le transfert tant que Q2.6 n'est pas validée", () => {
    expect(posee("P2/exceptions", "Q2.6", autre)).toBeDefined();
    expect(faits(autre).fait_transfert_article80.value).toBeUndefined();
  });

  it("établit l'hospitalisation et écarte le Centre 15 interétablissements", () => {
    expect(
      valeurs(autre, [
        "fait_hospitalisation",
        "fait_centre15_interetablissements",
        "fait_appel_centre15",
      ]),
    ).toEqual([true, false, undefined]);
  });

  it("établit le transfert une fois Q2.6 validée", () => {
    const validee = { ...autre, "Q2.6": ["11_AUCUNE"] } as const;
    expect(faits(validee).fait_transfert_article80).toEqual({
      value: true,
      provenance: "Q2.5 et Q2.6 : déplacement provisoire pendant le séjour.",
    });
  });
});

describe("un transfert depuis les urgences", () => {
  const transfert = definitif(["11_AUCUNE"], URGENCES);

  it("est un transfert malgré le « non » de Q2.2.1", () => {
    expect(faits({ ...URGENCES }).fait_transfert_article80.value).toBe(false);
    expect(faits(transfert).fait_transfert_article80.value).toBe(true);
  });

  it("ne présume pas de séjour", () => {
    expect(faits(transfert).fait_hospitalisation.value).toBeUndefined();
  });

  it("garde le Centre 15 absent tant que Q2.6 n'est pas validée", () => {
    const attente = { ...URGENCES, "Q2.5": "1_TRANSFERT" } as const;
    expect(
      valeurs(attente, [
        "fait_transfert_article80",
        "fait_centre15_interetablissements",
      ]),
    ).toEqual([true, undefined]);
  });
});

describe("l'ouverture directe par une admission en HAD (Q2.1.g)", () => {
  const directe = { ...HAD_A_DOMICILE, "Q2.6": ["11_AUCUNE"] } as const;

  it("pose Q2.6 sans Q2.5 ni Q2.6.a", () => {
    expect(posee("P2/transfert", "Q2.5", HAD_A_DOMICILE)).toBeUndefined();
    expect(posee("P2/exceptions", "Q2.6.a", HAD_A_DOMICILE)).toBeUndefined();
    expect(posee("P2/exceptions", "Q2.6", HAD_A_DOMICILE)).toBeDefined();
  });

  it("ne propose ni l'option 2, ni la 3, ni la 8", () => {
    expect(proposees(HAD_A_DOMICILE)).toEqual([
      "4_AIR_MER",
      "5_HAD",
      "6_USLD",
      "7_EHPAD",
      "9_DIALYSE_A_DOMICILE",
      "10_ADMISSION_HAD",
    ]);
  });

  it("établit l'article 80 une fois Q2.6 validée", () => {
    expect(faits(directe).fait_transfert_article80.value).toBe(true);
    expect(valeurs(directe, EXCEPTIONS)).toEqual(Array(8).fill(false));
    expect(
      faits(directe).fait_exception_article80_radiotherapie.provenance,
    ).toMatch(/admission en HAD/);
  });

  it("laisse le Centre 15 comme Q2.2.1 l'a établi", () => {
    expect(faits(directe).fait_appel_centre15.value).toBeUndefined();
  });
});
