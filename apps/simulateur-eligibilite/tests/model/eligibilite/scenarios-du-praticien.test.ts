// Le scénario du résultat praticien que choisit une trace (#133, D-112). Les
// seeds donnent les traces de l'oracle ; les autres traces sont écrites à la
// main, avec les seuls faits et cibles qu'une condition des règles lit.

import { describe, expect, it } from "vitest";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import type { IssuePraticien } from "../../../front/models/eligibilite/declarations/catalogue-resultats";
import type { Precisions } from "../../../front/models/eligibilite/precisions-du-resultat";
import {
  type IssueDuPraticien,
  scenariosDuPraticien,
} from "../../../front/models/eligibilite/scenarios-du-praticien";
import { SEEDS } from "../../../front/models/eligibilite/seeds-catalogue";
import {
  type Trace,
  traceDuResultat,
} from "../../../front/models/eligibilite/trace-du-resultat";
import { ciblesDe } from "./reponses-de-la-permission";
import { faux, trace, vrai } from "./traces-du-praticien";

const { issues } = await catalogueResultats();

const traceDeLaSeed = (id: string): Trace => {
  const seed = SEEDS.find((candidate) => candidate.id === id);
  if (!seed) throw new Error(`Seed inconnue : ${id}`);
  return traceDuResultat(seed.answers, ciblesDe(seed.answers));
};

const ids = (issue: IssueDuPraticien, depuis: Trace) =>
  scenariosDuPraticien(issue, issues[issue], depuis).map(({ id }) => id);

describe("les scénarios des seeds", () => {
  it("prend le scénario de l'oracle pour l'établissement", () => {
    expect(
      ids("ISSUE_ETABLISSEMENT", traceDeLaSeed("issue-etablissement")),
    ).toEqual(["transfert-provisoire"]);
  });

  it("prend le scénario de l'oracle pour la permission à la charge du patient", () => {
    expect(
      ids(
        "ISSUE_PERMISSION_PATIENT",
        traceDeLaSeed("issue-permission-patient"),
      ),
    ).toEqual(["demande-adulte"]);
  });

  it("prend le scénario de l'oracle pour la convocation", () => {
    expect(
      ids("ISSUE_CONVOCATION", traceDeLaSeed("issue-convocation")),
    ).toEqual(["controle"]);
  });

  // L'oracle a une ALD de base inconnue ; la seed a un transfert du Centre 15
  // (D-111). Nous vérifions donc le scénario `centre15`, et l'ALD plus bas.
  it("prend le scénario du Centre 15 pour la seed de la caisse", () => {
    expect(ids("ISSUE_CAISSE", traceDeLaSeed("issue-caisse"))).toEqual([
      "centre15",
    ]);
  });
});

describe("le contexte prouvé choisit le scénario le plus précis", () => {
  const etablissement = (article80Context?: Precisions["article80Context"]) =>
    ids(
      "ISSUE_ETABLISSEMENT",
      trace({}, {}, article80Context ? { article80Context } : {}),
    );

  it("prend le transfert définitif quand la durée est prouvée", () => {
    expect(etablissement({ kind: "transfer", duration: "permanent" })).toEqual([
      "transfert-definitif",
    ]);
  });

  it("prend le déplacement ponctuel d'un séjour", () => {
    expect(etablissement({ kind: "inpatient", duration: "temporary" })).toEqual(
      ["deplacement-ponctuel"],
    );
  });

  it("prend le repli quand la durée du transfert n'est pas prouvée", () => {
    expect(etablissement({ kind: "transfer" })).toEqual(["fallback"]);
  });

  it("prend le repli quand le contexte manque", () => {
    expect(etablissement()).toEqual(["fallback"]);
  });

  it("prend le repli pour une admission en HAD, dont la suite n'est pas prouvée", () => {
    expect(etablissement({ kind: "had" })).toEqual(["fallback"]);
  });

  it("prend l'appareil prouvé de la convocation", () => {
    const appareillage = { kind: "equipment", device: "podo-orthèse" };
    expect(
      ids(
        "ISSUE_CONVOCATION",
        trace({}, {}, { convocationContext: appareillage }),
      ),
    ).toEqual(["podo"]);
  });

  it("prend le repli d'un appareillage dont l'appareil n'est pas prouvé", () => {
    expect(
      ids(
        "ISSUE_CONVOCATION",
        trace({}, {}, { convocationContext: { kind: "equipment" } }),
      ),
    ).toEqual(["fallback"]);
  });

  it("prend le repli de la permission sans contexte", () => {
    expect(ids("ISSUE_PERMISSION_PATIENT", trace({}))).toEqual(["fallback"]);
  });

  it("ne prend jamais un scénario inactif", () => {
    const inactif = {
      ...issues.ISSUE_CONVOCATION.scenarios[0],
      id: "inactif",
      inactive: true,
      params: { scenario_id: "inactif", kind: "control" },
    };
    const issue = {
      ...issues.ISSUE_CONVOCATION,
      scenarios: [inactif, ...issues.ISSUE_CONVOCATION.scenarios],
    } as IssuePraticien;
    const choisis = scenariosDuPraticien(
      "ISSUE_CONVOCATION",
      issue,
      trace({}, {}, { convocationContext: { kind: "control" } }),
    );
    expect(choisis.map(({ id }) => id)).toEqual(["controle"]);
  });
});

// Chaque point, avec ce que la condition des règles lit.
const POINTS: readonly [scenario: string, trace: Trace][] = [
  ["ald-base", trace({ cible_preuve_ald_inconnue_decisive: true })],
  ["mineur", trace({ cible_reconnaissance_mineur_inconnue_decisive: true })],
  ["appareillage", trace({ cible_convocation_inconnue_decisive: true })],
  [
    "permission-inconnue",
    trace(
      { cible_couverture_inconnue_decisive: true },
      { fait_permission: vrai },
    ),
  ],
  [
    "transfert-inconnu",
    trace(
      { cible_couverture_inconnue_decisive: true },
      { fait_hospitalisation: vrai },
    ),
  ],
  ["samsah", trace({ cible_point_cnam: true }, { fait_motif_samsah: vrai })],
  ["pension", trace({ cible_point_cnam: true }, { fait_motif_pension: vrai })],
  [
    "centre15",
    trace(
      { cible_point_cnam: true },
      { fait_centre15_interetablissements: vrai },
    ),
  ],
  [
    "htnm",
    trace(
      { cible_point_cnam: true },
      { fait_htnm_hors_maternite: vrai, fait_htnm_segment_verifie: faux },
    ),
  ],
  [
    "camsp-urgence",
    trace(
      { cible_point_cnam: true, cible_dap_motif_camsp_cmpp: true },
      { fait_urgence_attestee: vrai },
    ),
  ],
  [
    "maternite-urgence",
    trace(
      { cible_point_cnam: true },
      { fait_dap_maternite: vrai, fait_urgence_attestee: vrai },
    ),
  ],
];

describe("les points ouverts de la caisse", () => {
  it.each(POINTS)("dit le point %s", (scenario, depuis) => {
    expect(ids("ISSUE_CAISSE", depuis)).toEqual([scenario]);
  });

  it("garde l'ordre des règles quand plusieurs points sont ouverts", () => {
    const cumul = trace(
      { cible_preuve_ald_inconnue_decisive: true },
      { fait_htnm_hors_maternite: vrai, fait_htnm_segment_verifie: faux },
    );
    expect(ids("ISSUE_CAISSE", cumul)).toEqual(["ald-base", "htnm"]);
  });

  it("ne dit pas le transfert inconnu quand l'article 80 est établi", () => {
    const connu = trace(
      { cible_couverture_inconnue_decisive: true },
      { fait_hospitalisation: vrai, fait_transfert_article80: vrai },
    );
    expect(ids("ISSUE_CAISSE", connu)).toEqual([]);
  });

  it("ne choisit aucun scénario quand aucun point ne se relit", () => {
    expect(ids("ISSUE_CAISSE", trace({}))).toEqual([]);
  });

  it("ne choisit pas un scénario inactif pour sa raison", () => {
    const inactif = trace({ cible_reason_code: "SOINS_NON_VERIFIABLES" });
    expect(ids("ISSUE_CAISSE", inactif)).toEqual([]);
  });

  it("prend le seul scénario qui porte la raison, quand aucun point ne se relit", () => {
    const raison = trace({ cible_reason_code: "CNAM_HTNM_HORS_MATERNITE" });
    expect(ids("ISSUE_CAISSE", raison)).toEqual(["htnm"]);
  });

  it("ne tranche pas entre deux scénarios qui portent la même raison", () => {
    const ambigue = trace({ cible_reason_code: "AUTRE_DROIT_NON_VERIFIABLE" });
    expect(ids("ISSUE_CAISSE", ambigue)).toEqual([]);
  });
});
