// Les précisions de la trace (#132) : une seule réponse validée les prouve,
// sinon la clé manque. `README.md` du paquet de l'éditeur, « Précisions
// éditoriales utiles ».

import { describe, expect, it } from "vitest";
import type { Precisions } from "../../../front/models/eligibilite/precisions-du-resultat";
import { traceDuResultat } from "../../../front/models/eligibilite/trace-du-resultat";
import { BRANCARD_20_KM } from "./reponses-de-la-branche";
import { appareillage, PAR_Q21 } from "./reponses-de-la-convocation";
import {
  ciblesDe,
  MINEUR,
  PATIENT_SEUL,
  PLUSIEURS_PERMISSIONS,
  type Reponses,
} from "./reponses-de-la-permission";
import {
  definitif,
  HAD_A_DOMICILE,
  provisoire,
  SEJOUR,
  URGENCES,
} from "./reponses-du-transfert";

// La trace de ces réponses, avec les cibles que calculent les règles.
const traceDe = (reponses: Reponses) =>
  traceDuResultat(reponses, ciblesDe(reponses));

const precisionsDe = (reponses: Reponses): Precisions =>
  traceDe(reponses).precisions;

// Un patient qui se rend à une consultation, et qui n'a rien d'autre à dire.
const CONSULTATION: Reponses = {
  ...PATIENT_SEUL,
  "Q2.1": "1_CONSULTATION",
};

// Une dialyse en centre seule, avec la nature de la séance.
const dialyse = (nature: Reponses["Q1.3.a"]): Reponses => ({
  ...CONSULTATION,
  "Q1.3": ["5_DIALYSE"],
  "Q1.3.a": nature,
});

describe("hospitalisation", () => {
  it.each([
    ["un séjour coché", SEJOUR, "H-SEJOUR"],
    [
      "une chimiothérapie",
      { ...URGENCES, "Q1.3": ["3_CHIMIOTHERAPIE"] },
      "H-SEANCE-CH",
    ],
    [
      "une chimiothérapie pendant un séjour",
      { ...SEJOUR, "Q1.3": ["3_CHIMIOTHERAPIE"] },
      "H-SEJOUR-CH",
    ],
    [
      "une hémodialyse confirmée par Q1.3.a",
      { ...URGENCES, "Q1.3": ["5_DIALYSE"], "Q1.3.a": "1_OUI" },
      "H-SEANCE-HE",
    ],
    [
      "deux séances vers le même lieu (Q2.1.f)",
      {
        ...URGENCES,
        "Q1.3": ["3_CHIMIOTHERAPIE", "4_RADIOTHERAPIE"],
        "Q2.1.f": "1_OUI",
      },
      "H-SEANCE-CH-RA",
    ],
  ] as const)("%s donne %s", (_cas, reponses, attendu) => {
    expect(precisionsDe(reponses as Reponses).hospitalisation).toBe(attendu);
  });

  it.each([
    ["aucun soin ni séjour", CONSULTATION],
    ["une dialyse qui n'est pas de l'hémodialyse", dialyse("2_AUTRE_DIALYSE")],
    ["une dialyse dont la nature est inconnue", dialyse("3_NE_SAIT_PAS")],
    ["l'admission en HAD à domicile", HAD_A_DOMICILE],
    [
      "deux séances sans Q2.1.f",
      { ...URGENCES, "Q1.3": ["3_CHIMIOTHERAPIE", "4_RADIOTHERAPIE"] },
    ],
  ] as const)("reste absente pour %s", (_cas, reponses) => {
    expect("hospitalisation" in precisionsDe(reponses as Reponses)).toBe(false);
  });
});

describe("atmp", () => {
  it("vaut l'identifiant commun quand Q2.2.1.b signale un AT/MP", () => {
    const reponses = {
      ...BRANCARD_20_KM,
      "Q2.2.1": ["3_AUTRE_CADRE"],
      "Q2.2.1.b": ["1_ATMP"],
    } as Reponses;
    expect(precisionsDe(reponses).atmp).toBe("ATMP");
    expect("atmp" in precisionsDe(BRANCARD_20_KM)).toBe(false);
  });
});

describe("careFamily", () => {
  it("vaut le numéro de l'option de Q2.1 d'un soin", () => {
    expect(
      precisionsDe({ ...CONSULTATION, "Q2.1": "4_BIOLOGIE" }).careFamily,
    ).toBe(4);
  });

  it("manque quand P1 prouve le motif et que Q2.1 ne se pose pas", () => {
    expect("careFamily" in precisionsDe(BRANCARD_20_KM)).toBe(false);
  });

  it("manque pour une option qui a sa propre branche", () => {
    expect("careFamily" in precisionsDe(PAR_Q21)).toBe(false);
  });
});

describe("aldRecognized et aldRelated", () => {
  it("valent « oui » ensemble quand Q1.3 coche l'ALD", () => {
    const reponses = { ...BRANCARD_20_KM, "Q1.3": ["2_ALD"] } as Reponses;
    expect(precisionsDe(reponses)).toMatchObject({
      aldRecognized: true,
      aldRelated: true,
    });
  });

  it("manquent sans l'ALD : ne pas la cocher ne dit pas qu'il n'y en a pas", () => {
    const precisions = precisionsDe(BRANCARD_20_KM);
    expect("aldRecognized" in precisions).toBe(false);
    expect("aldRelated" in precisions).toBe(false);
  });
});

describe("dialysisType", () => {
  it.each([
    ["2_AUTRE_DIALYSE", "non-hemodialyse"],
    ["3_NE_SAIT_PAS", "inconnu"],
  ] as const)("Q1.3.a %s donne %s", (reponse, attendu) => {
    expect(precisionsDe(dialyse(reponse)).dialysisType).toBe(attendu);
  });

  it("manque pour une hémodialyse : le type est alors connu, pas à préciser", () => {
    expect("dialysisType" in precisionsDe(dialyse("1_OUI"))).toBe(false);
  });
});

describe("repeatedTripsPlanned", () => {
  const SERIE = {
    ...BRANCARD_20_KM,
    "Q2.3.1": "2_PLUS_DE_CINQUANTE_KM",
    "Q2.3.4": "2_NON",
  } as const;

  it("vaut « oui » quand Q2.3.3 le dit", () => {
    expect(
      precisionsDe({ ...SERIE, "Q2.3.3": "1_OUI" }).repeatedTripsPlanned,
    ).toBe(true);
  });

  it("manque pour « non » : la réponse ne dit pas quelle condition manque", () => {
    expect(
      "repeatedTripsPlanned" in precisionsDe({ ...SERIE, "Q2.3.3": "2_NON" }),
    ).toBe(false);
  });
});

describe("article80Context", () => {
  it.each([
    [
      "un transfert définitif",
      definitif(["11_AUCUNE"]),
      { kind: "transfer", duration: "permanent" },
    ],
    [
      "un transfert provisoire",
      provisoire(["11_AUCUNE"]),
      { kind: "transfer", duration: "temporary" },
    ],
    [
      "un autre déplacement pendant le séjour",
      { ...SEJOUR, "Q2.5": "2_AUTRE_DEPLACEMENT", "Q2.6": ["11_AUCUNE"] },
      { kind: "inpatient", duration: "temporary" },
    ],
    [
      "l'admission en HAD à domicile",
      { ...HAD_A_DOMICILE, "Q2.6": ["11_AUCUNE"] },
      { kind: "had" },
    ],
  ] as const)("%s donne son contexte", (_cas, reponses, attendu) => {
    expect(precisionsDe(reponses as Reponses).article80Context).toEqual(
      attendu,
    );
  });

  it("manque sans transfert ni déplacement", () => {
    expect("article80Context" in precisionsDe(BRANCARD_20_KM)).toBe(false);
  });
});

describe("permissionContext et permissionRepeated", () => {
  it("une demande expresse d'adulte (Q2.7 option 4) donne son contexte", () => {
    const reponses = {
      ...PATIENT_SEUL,
      "Q2.7": "4_ADULTE_A_SA_CHARGE",
      "Q2.7.a": "1_OUI",
    } as Reponses;
    expect(precisionsDe(reponses).permissionContext).toEqual({
      kind: "adult-explicit",
    });
  });

  it("une permission autorisée ne donne pas de contexte", () => {
    const reponses = {
      ...PATIENT_SEUL,
      "Q2.7": "3_ADULTE_AUTORISEE",
    } as Reponses;
    expect("permissionContext" in precisionsDe(reponses)).toBe(false);
  });

  it("Q2.8.5 « Non » donne false, « Oui » donne true", () => {
    expect(traceDe(MINEUR).permissionRepeated).toBe(false);
    expect(traceDe(PLUSIEURS_PERMISSIONS).permissionRepeated).toBe(true);
  });
});

describe("convocationContext et deviceCategory", () => {
  it.each([
    ["1_CONTROLE_MEDICAL", "control"],
    ["2_EXPERT_JURIDICTION", "expert"],
    ["3_AUDIENCE_CONSULTATION", "audience"],
    ["4_EXPERT_CONTESTATION", "dispute"],
    ["5_COMMISSION_RECOURS", "commission"],
  ] as const)("Q2.10 %s donne le genre %s", (categorie, kind) => {
    expect(
      precisionsDe({ ...PAR_Q21, "Q2.10": categorie }).convocationContext,
    ).toEqual({ kind });
  });

  it.each([
    ["1_PROTHESE_OCULAIRE_FACIALE", "prothèse oculaire ou faciale"],
    ["2_PODO_ORTHESE", "podo-orthèse"],
    ["3_ORTHOPROTHESE", "orthoprothèse"],
  ] as const)(
    "l'appareillage %s donne l'appareil « %s »",
    (appareil, device) => {
      expect(
        precisionsDe(appareillage("1_OUI", appareil)).convocationContext,
      ).toEqual({ kind: "equipment", device });
    },
  );

  it("un autre appareillage donne la catégorie hors périmètre, sans appareil", () => {
    const precisions = precisionsDe(appareillage("1_OUI", "4_AUTRE"));
    expect(precisions.deviceCategory).toBe("hors-categories");
    expect(precisions.convocationContext).toEqual({ kind: "equipment" });
  });

  it("« Aucune de ces situations » ne donne aucun contexte", () => {
    const precisions = precisionsDe({ ...PAR_Q21, "Q2.10": "7_AUCUNE" });
    expect("convocationContext" in precisions).toBe(false);
    expect("deviceCategory" in precisions).toBe(false);
  });
});

describe("les précisions qu'aucune question ne pose", () => {
  it("restent absentes, même au bout d'un parcours de ligne régulière", () => {
    const precisions = precisionsDe({ ...BRANCARD_20_KM, "Q2.3.2": true });
    for (const cle of [
      "lineType",
      "camspType",
      "eventFinalityClarified",
      "transportExclusionRule",
    ])
      expect(cle in precisions).toBe(false);
  });

  it("ne donnent pas de partie terrestre : Q2.3.2 dit la ligne, pas ce qui l'entoure", () => {
    expect(
      "partieTerrestre" in traceDe({ ...BRANCARD_20_KM, "Q2.3.2": true }),
    ).toBe(false);
  });
});
