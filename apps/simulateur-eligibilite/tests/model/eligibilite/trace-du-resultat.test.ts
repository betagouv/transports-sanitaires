// La trace du résultat (#132) : ce que les textes de R2 lisent. Les dix seeds
// en donnent une chacune, comparée à la trace de l'oracle de la v10.1.0,
// `exemples-traces-dix-issues.json` (nommée par son rang dans le fichier).
//
// L'oracle donne à toutes ses traces `permissionRepeated: false` et
// `segments.ground: true` : ce sont les valeurs par défaut de ses fixtures,
// non des réponses. Nos traces n'ont ces clés que si une réponse les prouve.

import { describe, expect, it } from "vitest";
import { CIBLES_ENUMEREES } from "../../../front/models/eligibilite/declarations/cibles";
import { SEEDS } from "../../../front/models/eligibilite/seeds-catalogue";
import {
  type Trace,
  traceDuResultat,
} from "../../../front/models/eligibilite/trace-du-resultat";
import { BRANCARD_20_KM, faits, type Reponses } from "./reponses-de-la-branche";
import { ciblesDe, PATIENT_SEUL } from "./reponses-de-la-permission";

// La trace de ces réponses, avec les cibles que calculent les règles.
const traceDe = (reponses: Reponses): Trace =>
  traceDuResultat(reponses, ciblesDe(reponses));

const seed = (id: string): Reponses => {
  const trouvee = SEEDS.find((candidate) => candidate.id === id);
  if (!trouvee) throw new Error(`Seed inconnue : ${id}`);
  return trouvee.answers;
};

// Rang dans l'oracle, seed, critères de Q1.2, Q2.8.5, précisions. Les valeurs
// sont recopiées de l'oracle ; une différence a son commentaire.
const CAS: readonly [
  rang: number,
  seed: string,
  criteres: number[],
  permissionRepeated: boolean | undefined,
  precisions: object,
][] = [
  // Oracle : lexical.hospitalisation = H-SEANCE-HE.
  [0, "issue-pmt", [1, 5], undefined, { hospitalisation: "H-SEANCE-HE" }],
  [
    1,
    "issue-dap-sans-urgence",
    [1, 5],
    undefined,
    { hospitalisation: "H-SEANCE-HE" },
  ],
  [
    2,
    "issue-dap-urgence-attestee",
    [1, 5],
    undefined,
    { hospitalisation: "H-SEANCE-HE" },
  ],
  // Oracle : lexical vide, permissionRepeated = false (Q2.8.5 « Non »).
  [3, "issue-s3141", [1, 5], false, {}],
  // Oracle : lexical.careFamily = 1.
  [4, "issue-non-eligible", [1], undefined, { careFamily: 1 }],
  // L'oracle a une ALD de base inconnue et un lexique vide. Nous prenons un
  // transfert du Centre 15 : le contexte de l'article 80 en est la preuve.
  [
    5,
    "issue-caisse",
    [1],
    undefined,
    { article80Context: { kind: "transfer", duration: "permanent" } },
  ],
  // Oracle : article80Context = { kind: transfer, duration: temporary }.
  [
    6,
    "issue-etablissement",
    [1],
    undefined,
    { article80Context: { kind: "transfer", duration: "temporary" } },
  ],
  // Oracle : permissionContext = { kind: adult-explicit }.
  [
    7,
    "issue-permission-patient",
    [1],
    undefined,
    { permissionContext: { kind: "adult-explicit" } },
  ],
  // Oracle : convocationContext = { kind: control }.
  [
    8,
    "issue-convocation",
    [1],
    undefined,
    { convocationContext: { kind: "control" } },
  ],
  // L'oracle a un lexique vide. Notre seed est une dialyse, qui le remplit.
  [
    9,
    "issue-dap-etranger-a-examiner",
    [1, 5],
    undefined,
    { hospitalisation: "H-SEANCE-HE" },
  ],
];

describe("la trace des dix seeds", () => {
  it("couvre les dix issues, une seed chacune", () => {
    expect(SEEDS.map(({ expected }) => expected.cible_issue_id).sort()).toEqual(
      [...CIBLES_ENUMEREES.cible_issue_id].sort(),
    );
  });

  describe.each(CAS)(
    "oracle n° %i : %s",
    (_rang, id, criteres, repetee, precisions) => {
      const trace = traceDe(seed(id));

      it("garde les cibles des règles", () => {
        expect(trace.cibles.cible_issue_id).toBe(
          SEEDS.find((candidate) => candidate.id === id)?.expected
            .cible_issue_id,
        );
      });

      it("liste les critères de Q1.2 réellement choisis", () => {
        expect(trace.criteres).toEqual(criteres);
      });

      it("ne dit Q2.8.5 que si elle s'est posée", () => {
        expect(trace.permissionRepeated).toBe(repetee);
        expect("permissionRepeated" in trace).toBe(repetee !== undefined);
      });

      it("ne donne que les précisions que les réponses prouvent", () => {
        expect(trace.precisions).toEqual(precisions);
      });

      it("n'invente pas de partie terrestre", () => {
        expect("partieTerrestre" in trace).toBe(false);
      });
    },
  );
});

describe("la trace, quand les réponses manquent ou ne comptent plus", () => {
  it("donne les faits tels que la préconisation les établit", () => {
    const trace = traceDe(BRANCARD_20_KM);
    expect(trace.faits).toEqual(faits(BRANCARD_20_KM));
  });

  it("donne des critères vides quand Q1.2 ne se pose pas", () => {
    expect(traceDe(PATIENT_SEUL).criteres).toEqual([]);
  });

  it("ne reprend pas une réponse à une question qui ne se pose plus", () => {
    // Un patient seul : Q1.2 ne se pose pas. Q2.8.5 ni Q2.7 non plus, hors
    // permission. Leurs réponses restées dans le brouillon ne passent pas.
    const restes = {
      ...PATIENT_SEUL,
      "Q2.1": "1_CONSULTATION",
      "Q1.2": ["8_BRANCARDAGE"],
      "Q2.7": "4_ADULTE_A_SA_CHARGE",
      "Q2.8.5": "1_OUI",
    } as Reponses;
    const trace = traceDe(restes);
    expect(trace.criteres).toEqual([]);
    expect("permissionRepeated" in trace).toBe(false);
    expect(trace.precisions.permissionContext).toBeUndefined();
  });

  it("garde une clé absente, et non une valeur vide, pour une précision inconnue", () => {
    const { precisions } = traceDe(seed("issue-pmt"));
    expect(Object.keys(precisions)).toEqual(["hospitalisation"]);
  });
});
