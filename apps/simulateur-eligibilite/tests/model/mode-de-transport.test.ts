// P0 et P1 du modèle : les questions qui se posent, les faits que leurs
// réponses établissent, et le mode de transport que les règles en tirent.
//
// Le catalogue de l'éditeur fait foi pour les questions, et
// `docs/tasks/10-annexe-faits.md` pour le lien d'une réponse à un fait.

import { describe, expect, it } from "vitest";
import { model } from "../../front/model";
import type { Faits } from "../../front/model/declarations/faits";
import type { Questions } from "../../front/model/declarations/questions";
import { preconisationOf } from "../../front/socle/model";
import {
  type Answers,
  askedPages,
  askedQuestions,
  type Page,
} from "../../front/socle/questionnaire-engine/question";

type Reponses = Answers<Questions>;

const pages: readonly Page[] = model.transportAndEligibility.parts.flatMap(
  (part) => part.pages,
);
const pagesPosees = (reponses: Reponses) =>
  askedPages(pages, reponses).map((page) => page.id);
const question = (id: keyof Questions, reponses: Reponses) => {
  const posees = pages.flatMap((page) => askedQuestions(page, reponses));
  const trouvee = posees.find((posee) => posee.id === id);
  if (!trouvee) throw new Error(`${id} ne se pose pas.`);
  return trouvee;
};
const optionsDe = (id: keyof Questions, reponses: Reponses) => {
  const posee = question(id, reponses);
  return "options" in posee ? posee.options.map((option) => option.value) : [];
};
const faitsDe = (reponses: Reponses) =>
  preconisationOf(model, reponses).faits as Faits;
const modeDe = (reponses: Reponses) =>
  preconisationOf(model, reponses).cibles.cible_mode_id;

const SEUL: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q1.1": "1_SEUL",
  "Q1.3": ["7_AUCUNE"],
};
const AVEC_UN_PROCHE: Reponses = { ...SEUL, "Q1.1": "2_AVEC_UN_PROCHE" };
const AVEC_UN_PROFESSIONNEL: Reponses = {
  ...SEUL,
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
};

describe("les pages de P0 et P1", () => {
  it("un patient autonome saute les critères et dit sa préférence", () => {
    expect(pagesPosees(SEUL)).toEqual(["P0/1", "P1/1", "P1/3", "P1/4"]);
  });

  it("un patient accompagné d'un proche suit le même chemin", () => {
    expect(pagesPosees(AVEC_UN_PROCHE)).toEqual([
      "P0/1",
      "P1/1",
      "P1/3",
      "P1/4",
    ]);
  });

  it("l'aide d'un professionnel pose les critères, pas la préférence", () => {
    expect(pagesPosees(AVEC_UN_PROFESSIONNEL)).toEqual([
      "P0/1",
      "P1/1",
      "P1/2",
      "P1/3",
    ]);
  });
});

describe("Q1.3, le transport partagé", () => {
  it.each([
    ["un transport assis professionnel", ["1_PAS_AUTONOME"]],
    ["un fauteuil sans transfert", ["6_FAUTEUIL_SANS_TRANSFERT"]],
  ] as const)("se propose pour %s", (_, criteres) => {
    const reponses = { ...AVEC_UN_PROFESSIONNEL, "Q1.2": criteres };
    expect(optionsDe("Q1.3", reponses)).toContain("6_PARTAGE_INCOMPATIBLE");
  });

  it("ne se propose pas quand un critère impose l'ambulance", () => {
    const reponses = {
      ...AVEC_UN_PROFESSIONNEL,
      "Q1.2": ["1_PAS_AUTONOME", "8_BRANCARDAGE"],
    } as const;
    expect(optionsDe("Q1.3", reponses)).not.toContain("6_PARTAGE_INCOMPATIBLE");
  });

  it("ne se propose pas à un patient qui se passe de professionnel", () => {
    expect(optionsDe("Q1.3", SEUL)).not.toContain("6_PARTAGE_INCOMPATIBLE");
    expect(optionsDe("Q1.3", AVEC_UN_PROCHE)).not.toContain(
      "6_PARTAGE_INCOMPATIBLE",
    );
  });
});

describe("Q1.4, le libellé", () => {
  it("dit « en toute autonomie » pour un patient qui se déplace seul", () => {
    expect(question("Q1.4", SEUL).label).toContain("en toute autonomie");
  });

  it("dit « avec l’aide d’un proche » pour un patient accompagné", () => {
    expect(question("Q1.4", AVEC_UN_PROCHE).label).toContain(
      "avec l’aide d’un proche",
    );
  });
});

describe("les faits de P1", () => {
  it.each([
    ["1_PAS_AUTONOME", "fait_critere_tap"],
    ["2_AIDE_TECHNIQUE", "fait_critere_tap"],
    ["3_TRANSMISSION_PAR_UN_PROFESSIONNEL", "fait_critere_tap"],
    ["4_HYGIENE", "fait_critere_tap"],
    ["5_RISQUE_DE_MALAISE", "fait_critere_tap"],
    ["6_FAUTEUIL_SANS_TRANSFERT", "fait_critere_fauteuil"],
    ["7_ALLONGE", "fait_critere_allonge"],
    ["8_BRANCARDAGE", "fait_critere_brancard"],
    ["9_SURVEILLANCE", "fait_critere_surveillance"],
    ["10_OXYGENE", "fait_critere_oxygene"],
    ["11_ASEPSIE", "fait_critere_asepsie"],
  ] as const)(
    "le critère %s de Q1.2 établit %s, et lui seul",
    (critere, fait) => {
      const etablis = faitsDe({ ...AVEC_UN_PROFESSIONNEL, "Q1.2": [critere] });
      const criteres = Object.keys(etablis).filter(
        (nom) => nom.startsWith("fait_critere_") && etablis[nom as keyof Faits],
      );
      expect(criteres).toEqual([fait]);
    },
  );

  it("l'aide d'un professionnel et le proche viennent de Q1.1", () => {
    expect(faitsDe(SEUL)).toMatchObject({
      fait_autonomie_professionnel: false,
      fait_accompagnant: false,
    });
    expect(faitsDe(AVEC_UN_PROCHE)).toMatchObject({
      fait_autonomie_professionnel: false,
      fait_accompagnant: true,
    });
    expect(faitsDe(AVEC_UN_PROFESSIONNEL)).toMatchObject({
      fait_autonomie_professionnel: true,
      fait_accompagnant: false,
    });
  });

  it("le partage incompatible vient de la case de Q1.3", () => {
    const tap = {
      ...AVEC_UN_PROFESSIONNEL,
      "Q1.2": ["1_PAS_AUTONOME"],
    } as const;
    expect(faitsDe(tap).fait_partage_incompatible).toBe(false);
    expect(
      faitsDe({ ...tap, "Q1.3": ["6_PARTAGE_INCOMPATIBLE"] })
        .fait_partage_incompatible,
    ).toBe(true);
  });

  it("la préférence pour les transports en commun vient de Q1.4", () => {
    expect(
      faitsDe({ ...SEUL, "Q1.4": "1_VEHICULE_PERSONNEL" })
        .fait_prefere_transport_commun,
    ).toBe(false);
    expect(
      faitsDe({ ...SEUL, "Q1.4": "2_TRANSPORTS_EN_COMMUN" })
        .fait_prefere_transport_commun,
    ).toBe(true);
  });

  it("l'équipement bariatrique n'en établit aucun", () => {
    const sans = faitsDe({ ...SEUL, "Q1.4": "1_VEHICULE_PERSONNEL" });
    const avec = faitsDe({
      ...SEUL,
      "Q1.3": ["1_EQUIPEMENT_BARIATRIQUE"],
      "Q1.4": "1_VEHICULE_PERSONNEL",
    });
    expect(avec).toEqual(sans);
  });
});

describe("P1 complète", () => {
  it("l'est quand chaque question posée a sa réponse", () => {
    expect(
      faitsDe({ ...SEUL, "Q1.4": "1_VEHICULE_PERSONNEL" }).fait_p1_complete,
    ).toBe(true);
  });

  it("ne l'est pas tant que la préférence manque", () => {
    expect(faitsDe(SEUL).fait_p1_complete).toBe(false);
  });

  it("ne l'est pas sans critère pour l'aide d'un professionnel", () => {
    expect(faitsDe(AVEC_UN_PROFESSIONNEL).fait_p1_complete).toBe(false);
  });

  it("ne dépend pas de Q0.1 : un besoin n'est pas un fait", () => {
    const { "Q0.1": _besoin, ...sansBesoin } = {
      ...SEUL,
      "Q1.4": "1_VEHICULE_PERSONNEL",
    } as const;
    expect(faitsDe(sansBesoin).fait_p1_complete).toBe(true);
  });
});

describe("le mode de transport", () => {
  it.each([
    ["VEHICULE_PERSONNEL", { ...SEUL, "Q1.4": "1_VEHICULE_PERSONNEL" }],
    ["TRANSPORT_COMMUN", { ...SEUL, "Q1.4": "2_TRANSPORTS_EN_COMMUN" }],
    [
      "VEHICULE_PERSONNEL",
      { ...AVEC_UN_PROCHE, "Q1.4": "1_VEHICULE_PERSONNEL" },
    ],
    [
      "TRANSPORT_COMMUN",
      { ...AVEC_UN_PROCHE, "Q1.4": "2_TRANSPORTS_EN_COMMUN" },
    ],
    ["TAP", { ...AVEC_UN_PROFESSIONNEL, "Q1.2": ["2_AIDE_TECHNIQUE"] }],
    [
      "TPMR",
      {
        ...AVEC_UN_PROFESSIONNEL,
        "Q1.2": ["2_AIDE_TECHNIQUE", "6_FAUTEUIL_SANS_TRANSFERT"],
      },
    ],
    [
      "AMBULANCE",
      {
        ...AVEC_UN_PROFESSIONNEL,
        "Q1.2": ["2_AIDE_TECHNIQUE", "6_FAUTEUIL_SANS_TRANSFERT", "7_ALLONGE"],
      },
    ],
    ["AMBULANCE", { ...AVEC_UN_PROFESSIONNEL, "Q1.2": ["8_BRANCARDAGE"] }],
    ["AMBULANCE", { ...AVEC_UN_PROFESSIONNEL, "Q1.2": ["9_SURVEILLANCE"] }],
    ["AMBULANCE", { ...AVEC_UN_PROFESSIONNEL, "Q1.2": ["10_OXYGENE"] }],
    ["AMBULANCE", { ...AVEC_UN_PROFESSIONNEL, "Q1.2": ["11_ASEPSIE"] }],
  ] as const)("est %s pour %j", (mode, reponses) => {
    expect(modeDe(reponses)).toBe(mode);
  });

  it("n'est pas rendu tant que P1 n'est pas complète", () => {
    expect(modeDe(SEUL)).toBeNull();
  });
});
