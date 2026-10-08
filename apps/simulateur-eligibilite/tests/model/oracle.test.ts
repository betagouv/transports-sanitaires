// L'oracle de l'éditeur, rejoué contre les règles : les 25 cas de référence
// D01 à D25, puis les frontières que son test du moteur vérifie.
//
// Les cas sont écrits en faits, comme l'éditeur les livre
// (`tests/test_publicode.mjs` du paquet). Chacun part de faits tous à « non »,
// P1 et P2 complètes, et n'en change que quelques-uns. Les identifiants sont
// ceux de l'éditeur : un désaccord remonte sous ce nom.

import { describe, expect, it } from "vitest";
import type { Cibles } from "../../front/model/declarations/cibles";
import { AUCUN_FAIT, type Faits } from "../../front/model/declarations/faits";
import { cibles } from "../../front/model/preconisation";

type Changements = Partial<Faits>;
type Issue = Cibles["cible_issue_id"];

const preconiser = (changements: Changements) =>
  cibles({
    ...AUCUN_FAIT,
    fait_p1_complete: true,
    fait_p2_complete: true,
    ...changements,
  });
const issueDe = (changements: Changements) =>
  preconiser(changements).cible_issue_id;

// La prestation est couverte : ses quatre preuves sont réunies.
const SOIN_COUVERT: Changements = {
  fait_source_officielle_active: true,
  fait_correspondance_univoque: true,
  fait_conditions_soin_verifiees: true,
  fait_regime_verifie: true,
};
const BRANCARD: Changements = { ...SOIN_COUVERT, fait_critere_brancard: true };
const ALD: Changements = {
  ...SOIN_COUVERT,
  fait_ald_liee: true,
  fait_ald_base_3: true,
  fait_critere_tap: true,
  fait_autonomie_professionnel: true,
};
const SERIE: Changements = {
  ...SOIN_COUVERT,
  fait_distance_plus_50: true,
  fait_nombre_transports: 4,
  fait_meme_type_soins: true,
  fait_dans_deux_mois: true,
  fait_urgence_repondue: true,
};
const LONGUE_DISTANCE: Changements = {
  ...SOIN_COUVERT,
  fait_distance_plus_150: true,
  fait_urgence_repondue: true,
};
const TRANSFERT: Changements = {
  ...SOIN_COUVERT,
  fait_transfert_article80: true,
  fait_hospitalisation: true,
};
const CENTRE_15: Changements = {
  ...TRANSFERT,
  fait_centre15_interetablissements: true,
};
const MATERNITE: Changements = {
  fait_evenement_sans_soin: true,
  fait_dap_maternite: true,
  fait_urgence_repondue: true,
};
const ALD_SANS_BASE_3: Changements = { ...ALD, fait_ald_base_3: false };
const ALD_INVERIFIABLE: Changements = {
  ...ALD_SANS_BASE_3,
  fait_preuve_ald_inconnue_decisive: true,
};
const URGENCE: Changements = { fait_urgence_attestee: true };

const CAS: readonly [id: string, faits: Changements, issue: Issue][] = [
  ["D01", BRANCARD, "ISSUE_PMT"],
  ["D02", { ...BRANCARD, fait_correspondance_univoque: false }, "ISSUE_CAISSE"],
  [
    "D03",
    { ...BRANCARD, fait_exclusion_soin_prouvee: true },
    "ISSUE_NON_ELIGIBLE",
  ],
  ["D04", ALD, "ISSUE_PMT"],
  ["D05", ALD_SANS_BASE_3, "ISSUE_NON_ELIGIBLE"],
  ["D06", ALD_INVERIFIABLE, "ISSUE_CAISSE"],
  ["D07", { ...SERIE, fait_ald_liee: true }, "ISSUE_CAISSE"],
  ["D08", SERIE, "ISSUE_DAP_SANS_URGENCE"],
  ["D09", { ...SERIE, ...URGENCE }, "ISSUE_DAP_URGENCE_ATTESTEE"],
  ["D10", { ...SERIE, fait_nombre_transports: 3 }, "ISSUE_NON_ELIGIBLE"],
  ["D11", { ...SERIE, fait_distance_plus_50: false }, "ISSUE_NON_ELIGIBLE"],
  ["D12", LONGUE_DISTANCE, "ISSUE_DAP_SANS_URGENCE"],
  ["D13", { ...LONGUE_DISTANCE, ...URGENCE }, "ISSUE_DAP_URGENCE_ATTESTEE"],
  ["D14", TRANSFERT, "ISSUE_ETABLISSEMENT"],
  ["D15", CENTRE_15, "ISSUE_CAISSE"],
  ["D16", { ...CENTRE_15, ...URGENCE }, "ISSUE_CAISSE"],
  ["D17", { ...SOIN_COUVERT, fait_htnm_hors_maternite: true }, "ISSUE_CAISSE"],
  ["D18", { ...BRANCARD, fait_htnm_hors_maternite: true }, "ISSUE_CAISSE"],
  ["D19", MATERNITE, "ISSUE_DAP_SANS_URGENCE"],
  ["D20", { ...MATERNITE, ...URGENCE }, "ISSUE_CAISSE"],
  ["D21", { ...ALD_SANS_BASE_3, fait_ald_base_4_mineur: true }, "ISSUE_PMT"],
  ["D22", ALD_INVERIFIABLE, "ISSUE_CAISSE"],
  ["D23", ALD_SANS_BASE_3, "ISSUE_NON_ELIGIBLE"],
  [
    "D24",
    { ...SOIN_COUVERT, fait_convocation: true, fait_evenement_sans_soin: true },
    "ISSUE_CONVOCATION",
  ],
  ["D25", BRANCARD, "ISSUE_PMT"],
];

describe("l'oracle de l'éditeur", () => {
  it.each(CAS)("%s", (_id, faits, issue) => {
    expect(issueDe(faits)).toBe(issue);
  });
});

describe("la preuve de la prestation", () => {
  it.each([
    "fait_source_officielle_active",
    "fait_correspondance_univoque",
    "fait_conditions_soin_verifiees",
    "fait_regime_verifie",
  ] as const)("sans %s, oriente vers la caisse", (preuve) => {
    expect(issueDe({ ...BRANCARD, [preuve]: false })).toBe("ISSUE_CAISSE");
  });
});

describe("le mode de transport", () => {
  it.each([
    "fait_critere_allonge",
    "fait_critere_brancard",
    "fait_critere_surveillance",
    "fait_critere_oxygene",
    "fait_critere_asepsie",
  ] as const)("%s donne l'ambulance", (critere) => {
    const { cible_mode_id } = preconiser({
      ...SOIN_COUVERT,
      fait_autonomie_professionnel: true,
      [critere]: true,
    });
    expect(cible_mode_id).toBe("AMBULANCE");
  });
});

describe("les frontières de la demande d'accord préalable", () => {
  const ATMP: Changements = { fait_atmp_lie: true };
  const LIGNE: Changements = { fait_avion_bateau_ligne: true };
  const ALD_LIEE: Changements = { fait_ald_liee: true };

  it.each<[string, Changements, Issue]>([
    ["un AT/MP dispense la longue distance", LONGUE_DISTANCE, "ISSUE_PMT"],
    ["un AT/MP dispense la série", SERIE, "ISSUE_PMT"],
    [
      "un AT/MP et une ALD liée dispensent la série",
      { ...SERIE, ...ALD_LIEE },
      "ISSUE_PMT",
    ],
  ])("%s", (_titre, faits, issue) => {
    expect(issueDe({ ...faits, ...ATMP })).toBe(issue);
  });

  it("l'avion ou le bateau de ligne la demande, même avec un AT/MP", () => {
    expect(issueDe({ ...SERIE, ...ATMP, ...LIGNE })).toBe(
      "ISSUE_DAP_SANS_URGENCE",
    );
  });

  it("l'avion ou le bateau de ligne la demande, même avec une ALD liée", () => {
    expect(issueDe({ ...SERIE, ...LIGNE, ...ALD_LIEE })).toBe(
      "ISSUE_DAP_SANS_URGENCE",
    );
  });

  it("une urgence attestée sur une DAP propre au CAMSP oriente vers la caisse", () => {
    expect(issueDe({ ...SERIE, fait_dap_camsp: true, ...URGENCE })).toBe(
      "ISSUE_CAISSE",
    );
  });

  it("une exception à l'article 80 rend le transfert à l'assurance maladie", () => {
    expect(
      issueDe({ ...TRANSFERT, fait_exception_article80_radiotherapie: true }),
    ).toBe("ISSUE_PMT");
  });
});

describe("ce qui ne donne aucune issue", () => {
  it("la question d'urgence sans réponse, quand une DAP est requise", () => {
    expect(issueDe({ ...SERIE, fait_urgence_repondue: false })).toBeNull();
  });

  it("deux segments incompatibles avec un document unique", () => {
    const { cible_issue_id, cible_support_id } = preconiser({
      ...BRANCARD,
      fait_seconde_branche_incompatible: true,
    });
    expect(cible_issue_id).toBeNull();
    expect(cible_support_id).toBeNull();
  });

  it("un questionnaire incomplet", () => {
    expect(cibles(AUCUN_FAIT).cible_issue_id).toBeNull();
    expect(cibles(AUCUN_FAIT).cible_mode_id).toBeNull();
  });
});
