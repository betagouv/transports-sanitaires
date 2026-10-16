// Les boutons de R2 (#137) : pour chacune des dix issues, le libellé de
// l'impression et celui de l'action qui complète. « Précédent » et « Nouvelle
// simulation » sont ceux du socle, et se testent à l'écran.

import { describe, expect, it } from "vitest";
import {
  libelleDeCompletion,
  libelleDImpression,
} from "../../../front/models/eligibilite/boutons-du-resultat";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import { CIBLES_ENUMEREES } from "../../../front/models/eligibilite/declarations/cibles";
import { trace } from "./traces-du-praticien";

type Issue = (typeof CIBLES_ENUMEREES.cible_issue_id)[number];

const IMPRIMER = "Imprimer la fiche patient";
const PRESCRIPTION = "Compléter la prescription";
const DEMANDE = "Compléter la demande";

const BOUTONS: Readonly<
  Record<Issue, { imprimer: string | null; completer: string | null }>
> = {
  ISSUE_PMT: { imprimer: IMPRIMER, completer: PRESCRIPTION },
  ISSUE_DAP_SANS_URGENCE: { imprimer: IMPRIMER, completer: PRESCRIPTION },
  ISSUE_DAP_URGENCE_ATTESTEE: { imprimer: IMPRIMER, completer: PRESCRIPTION },
  ISSUE_S3141: { imprimer: IMPRIMER, completer: PRESCRIPTION },
  ISSUE_NON_ELIGIBLE: { imprimer: IMPRIMER, completer: null },
  ISSUE_CAISSE: { imprimer: null, completer: null },
  ISSUE_ETABLISSEMENT: { imprimer: null, completer: null },
  ISSUE_PERMISSION_PATIENT: { imprimer: null, completer: null },
  ISSUE_CONVOCATION: { imprimer: null, completer: null },
  ISSUE_DAP_ETRANGER_A_EXAMINER: { imprimer: null, completer: DEMANDE },
};

const ciblesDe = (issue: Issue | undefined | null) =>
  trace({ cible_issue_id: issue }).cibles;

describe("les boutons de chaque issue", () => {
  it("couvre les dix issues des règles", () => {
    expect(Object.keys(BOUTONS).sort()).toEqual(
      [...CIBLES_ENUMEREES.cible_issue_id].sort(),
    );
  });

  describe.each(Object.entries(BOUTONS))("%s", (issue, attendu) => {
    it("imprime la fiche, ou non", () => {
      expect(libelleDImpression(ciblesDe(issue as Issue))).toBe(
        attendu.imprimer,
      );
    });

    it("complète, ou non", () => {
      expect(libelleDeCompletion(ciblesDe(issue as Issue))).toBe(
        attendu.completer,
      );
    });
  });

  it.each([
    ["sans issue", undefined],
    ["sans objet", null],
  ])("%s, ni impression ni complétion", (_cas, issue) => {
    expect(libelleDImpression(ciblesDe(issue))).toBeNull();
    expect(libelleDeCompletion(ciblesDe(issue))).toBeNull();
  });

  it("« Compléter la demande » est le libellé du catalogue de l'éditeur", async () => {
    const catalogue = await catalogueResultats();
    expect(libelleDeCompletion(ciblesDe("ISSUE_DAP_ETRANGER_A_EXAMINER"))).toBe(
      catalogue.issues.ISSUE_DAP_ETRANGER_A_EXAMINER.completeLabel,
    );
  });
});
