// Le mineur en soins continus de plus de six mois, rejoué contre les règles.
//
// Depuis la réponse de l'éditeur du 15 octobre, le dispositif du mineur ne
// demande plus d'ALD : il a sa propre réponse en Q1.3. Une ALD à 100 % établie
// garde sa case, et les deux cases ne se cochent jamais ensemble. Les cas
// viennent de `tests/test_publicode_v1002.mjs` et `tests/audit_final_a.mjs` du
// paquet.

import { describe, expect, it } from "vitest";
import {
  ALD,
  ALD_NON_EXONERANTE,
  type Changements,
  preconiser,
  SERIE,
} from "./faits-de-l-oracle";

const MINEUR: Changements = { fait_mineur_soins_prolonges_reconnus: true };

// Les deux cases du cerfa : l'ALD à 100 %, ou l'exception du mineur.
const casesDe = (faits: Changements) => {
  const rendu = preconiser(faits);
  return {
    ald: rendu.cible_ald_juridiquement_qualifiante_3_ou_4_degres,
    mineur: rendu.cible_mineur_ald_non_exonerante_reconnue,
  };
};

describe("le mineur en soins continus", () => {
  it("donne une PMT sans aucune ALD", () => {
    const rendu = preconiser({ ...ALD, fait_ald_liee: false, ...MINEUR });
    expect(rendu.cible_issue_id).toBe("ISSUE_PMT");
    expect(rendu.cible_mineur_soins_prolonges).toBe(true);
    expect(casesDe({ ...ALD, fait_ald_liee: false, ...MINEUR })).toEqual({
      ald: false,
      mineur: true,
    });
  });

  it("avec une ALD qui n'exonère pas, coche la case du mineur", () => {
    const faits = { ...ALD_NON_EXONERANTE, ...MINEUR };
    expect(preconiser(faits).cible_issue_id).toBe("ISSUE_PMT");
    expect(casesDe(faits)).toEqual({ ald: false, mineur: true });
  });

  it("avec une ALD à 100 %, coche la case de l'ALD seule", () => {
    const faits = { ...ALD, ...MINEUR };
    expect(preconiser(faits).cible_issue_id).toBe("ISSUE_PMT");
    expect(casesDe(faits)).toEqual({ ald: true, mineur: false });
  });

  it("en série, donne une DAP sans motif d'avion ni de bateau", () => {
    const rendu = preconiser({
      ...SERIE,
      fait_ald_liee: true,
      fait_ald_exonerante_3_ou_4: false,
      ...MINEUR,
    });
    expect(rendu.cible_support_id).toBe("S3139h");
    expect(rendu.cible_mineur_ald_non_exonerante_reconnue).toBe(true);
    expect(rendu.cible_dap_motif_avion_bateau).toBe(false);
  });
});

describe("le mineur signalé, que personne ne peut vérifier", () => {
  it("renvoie vers la caisse, motivé", () => {
    const rendu = preconiser({
      ...ALD,
      fait_ald_liee: false,
      fait_mineur_soins_prolonges_reconnus: undefined,
      fait_mineur_soins_prolonges_a_verifier: true,
    });
    expect(rendu.cible_issue_id).toBe("ISSUE_CAISSE");
    expect(rendu.cible_reason_code).toBe(
      "MINEUR_RECONNAISSANCE_NON_VERIFIABLE",
    );
  });

  it("n'empêche pas l'ambulance, qui suffit seule", () => {
    expect(
      preconiser({
        fait_critere_brancard: true,
        fait_mineur_soins_prolonges_reconnus: undefined,
        fait_mineur_soins_prolonges_a_verifier: true,
      }).cible_issue_id,
    ).toBe("ISSUE_PMT");
  });
});
