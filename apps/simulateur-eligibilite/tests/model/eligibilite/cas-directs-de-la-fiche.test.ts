// Les décisions directes de la v10.1.1 qui donnent une fiche patient positive
// (#135) : l'ALD et le mineur en soins continus, avec ou sans proche. Neuf des
// treize cas de `impacts-v10.1.1-a.json`, sous leur identifiant chez l'éditeur.
// Chacun se joue par les réponses, de Q1.1 à la fiche. Les attendus sont
// recopiés de la projection de l'éditeur.
//
// Les quatre autres cas (`mineur-inconnu`, `ald-base-inconnue`,
// `proche-mineur-inconnu-vp` et `-tc`) vont à la caisse : ils n'ont pas de fiche
// patient, leur résultat est celui de #133.
//
// Aucun des treize cas ne mène à un accord préalable (`cible_dap_requise` est
// faux dans les treize). La dernière partie rejoue donc les mêmes patients à
// plus de 150 km (#136) : leur fiche est celle de la demande d'accord préalable,
// avec le contexte ALD ou mineur propre à cette issue.

import { describe, expect, it } from "vitest";
import { catalogueResultats } from "../../../front/models/eligibilite/catalogue-resultats";
import {
  type TexteDeLaFichePositive,
  texteDeLaFichePositive,
} from "../../../front/models/eligibilite/texte-de-la-fiche-positive";
import { traceDuResultat } from "../../../front/models/eligibilite/trace-du-resultat";
import { ciblesDe, type Reponses } from "./reponses-de-la-permission";

const catalogue = await catalogueResultats();

const BESOIN: Reponses = {
  "Q0.1": "1_VERIFIER",
  "Q2.2.1": ["4_AUCUNE"],
  "Q2.3.1": "1_CINQUANTE_KM_OU_MOINS",
  "Q2.3.2": false,
};
const AVEC_UN_PROFESSIONNEL = (cas: Reponses["Q1.3"]): Reponses => ({
  ...BESOIN,
  "Q1.1": "3_AVEC_UN_PROFESSIONNEL",
  "Q1.2": ["1_PAS_AUTONOME"],
  "Q1.3": cas,
});
const AVEC_UN_PROCHE = (
  cas: Reponses["Q1.3"],
  trajet: Reponses["Q1.4"],
): Reponses => ({
  ...BESOIN,
  "Q1.1": "2_AVEC_UN_PROCHE",
  "Q1.3": cas,
  "Q1.4": trajet,
});

const fiche = (reponses: Reponses): TexteDeLaFichePositive | undefined => {
  const cibles = ciblesDe(reponses);
  return texteDeLaFichePositive(
    catalogue,
    traceDuResultat(reponses, cibles),
    "ISSUE_PMT",
  );
};

const ALD =
  "Les soins à l’origine de ce déplacement sont liés à votre maladie de longue durée reconnue par l’Assurance Maladie. Ce cadre de soins et vos difficultés de déplacement permettent la prise en charge de votre transport par l’Assurance Maladie.";
const MINEUR =
  "Les soins à l’origine de ce déplacement sont liés à votre maladie de longue durée reconnue par l’Assurance Maladie. Votre besoin de soins continus pendant plus de six mois est reconnu par l’Assurance Maladie. Avec vos difficultés de déplacement, il permet la prise en charge de votre transport.";
const CARTE_TAP =
  "Vous pouvez voyager assis, mais votre état de santé nécessite une aide professionnelle pour vous déplacer ou des précautions particulières pendant le trajet. Cette aide permet de réaliser un trajet que vous ne pouvez pas effectuer de façon autonome. Votre trajet peut être organisé avec d’autres patients.";
const CARTE_PROPRE =
  "Vous pouvez vous déplacer seul ou avec l’aide d’un proche, sans avoir besoin d’une assistance professionnelle particulière.";

describe("avec un professionnel : un TAP, une carte et un badge", () => {
  it.each([
    ["ald-confirmee", AVEC_UN_PROFESSIONNEL(["2_ALD"]), ALD],
    [
      "mineur-sans-ald",
      AVEC_UN_PROFESSIONNEL(["8_MINEUR_SOINS_CONTINUS"]),
      MINEUR,
    ],
    [
      "ald-et-mineur",
      AVEC_UN_PROFESSIONNEL(["2_ALD", "8_MINEUR_SOINS_CONTINUS"]),
      ALD,
    ],
  ])("%s", (_id, reponses, raison) => {
    const texte = fiche(reponses);
    expect(texte?.titreDuPatient).toBe(
      "Vous êtes éligible à un transport sanitaire",
    );
    expect(texte?.titreDuPrescripteur).toBe(
      "Votre patient est éligible à un transport sanitaire",
    );
    expect(texte?.raison).toBe(raison);
    expect(texte?.cartes.map((carte) => carte.retenue)).toEqual([
      false,
      true,
      false,
    ]);
    expect(texte?.cartes[1]?.texte).toBe(CARTE_TAP);
    expect(texte?.consignes.etapes.map(({ titre }) => titre)).toEqual([
      "Dès votre rendez-vous fixé",
      "Le jour du transport",
    ]);
  });

  it("ald-confirmee : le seul badge est le critère 1 de Q1.2", () => {
    const badges = fiche(AVEC_UN_PROFESSIONNEL(["2_ALD"]))
      ?.consignes.etapes[0]?.blocs.flatMap((bloc) =>
        bloc.type === "liste" ? bloc.puces : [],
      )
      .flatMap((puce) => puce.badges ?? []);
    expect(badges).toEqual(["Aide professionnelle pour se déplacer"]);
  });

  it("mineur-sans-ald : le motif du modus est celui du mineur", () => {
    const etape = fiche(AVEC_UN_PROFESSIONNEL(["8_MINEUR_SOINS_CONTINUS"]))
      ?.consignes.etapes[0];
    const puces = etape?.blocs.flatMap((bloc) =>
      bloc.type === "liste" ? bloc.puces.map(({ texte }) => texte) : [],
    );
    expect(puces?.join("|")).toContain(
      "que votre transport sera pris en charge par l’Assurance Maladie au titre d’un transport pour des soins continus de plus de six mois reconnus par l’Assurance Maladie, concernant un enfant de moins de 18 ans présentant des difficultés de déplacement ;",
    );
  });
});

describe("avec un proche : le véhicule personnel ou les transports en commun", () => {
  it.each([
    ["proche-ald-confirmee-vp", ["2_ALD"], "1_VEHICULE_PERSONNEL", ALD],
    ["proche-ald-confirmee-tc", ["2_ALD"], "2_TRANSPORTS_EN_COMMUN", ALD],
    [
      "proche-mineur-confirme-vp",
      ["8_MINEUR_SOINS_CONTINUS"],
      "1_VEHICULE_PERSONNEL",
      MINEUR,
    ],
    [
      "proche-mineur-confirme-tc",
      ["8_MINEUR_SOINS_CONTINUS"],
      "2_TRANSPORTS_EN_COMMUN",
      MINEUR,
    ],
    [
      "proche-ald-mineur-confirmes-vp",
      ["2_ALD", "8_MINEUR_SOINS_CONTINUS"],
      "1_VEHICULE_PERSONNEL",
      ALD,
    ],
    [
      "proche-ald-mineur-confirmes-tc",
      ["2_ALD", "8_MINEUR_SOINS_CONTINUS"],
      "2_TRANSPORTS_EN_COMMUN",
      ALD,
    ],
  ] as const)("%s", (_id, cas, trajet, raison) => {
    const texte = fiche(AVEC_UN_PROCHE([...cas], trajet));
    expect(texte?.titreDuPatient).toBe(
      "Vous êtes éligible à une prise en charge de votre transport",
    );
    expect(texte?.titreDuPrescripteur).toBe(
      "Votre patient est éligible à une prise en charge de son transport",
    );
    expect(texte?.raison).toBe(raison);
    expect(texte?.cartes.find((carte) => carte.retenue)?.texte).toBe(
      CARTE_PROPRE,
    );
    expect(texte?.consignes.etapes.map(({ titre }) => titre)).toEqual([
      "Conditions de prises en charge",
      "Comment être remboursé ?",
    ]);
  });

  it("n'ajoute ni mode professionnel ni badge au proche", () => {
    const texte = fiche(AVEC_UN_PROCHE(["2_ALD"], "1_VEHICULE_PERSONNEL"));
    const badges = texte?.consignes.etapes
      .flatMap(({ blocs }) => blocs)
      .flatMap((bloc) => (bloc.type === "liste" ? bloc.puces : []))
      .flatMap((puce) => puce.badges ?? []);
    expect(badges).toEqual([]);
  });
});

// Les mêmes patients à plus de 150 km, sans série : un accord préalable (#136).
const A_150_KM: Reponses = {
  "Q2.3.1": "3_PLUS_DE_CENT_CINQUANTE_KM",
  "Q2.3.3": "2_NON",
};
const SANS_URGENCE: Reponses = { ...A_150_KM, "Q2.3.4": "2_NON" };
const URGENCE_ATTESTEE: Reponses = { ...A_150_KM, "Q2.3.4": "1_OUI" };

const demande = (reponses: Reponses) => {
  const cibles = ciblesDe(reponses);
  const issue = cibles.cible_issue_id;
  if (
    issue !== "ISSUE_DAP_SANS_URGENCE" &&
    issue !== "ISSUE_DAP_URGENCE_ATTESTEE"
  ) {
    throw new Error(`Pas d'accord préalable : ${issue}`);
  }
  return {
    issue,
    texte: texteDeLaFichePositive(
      catalogue,
      traceDuResultat(reponses, cibles),
      issue,
    ),
  };
};

const DISTANCE =
  "La prise en charge de votre transport nécessite l’accord préalable de l’Assurance Maladie car le trajet dépasse 150 km.";
const ALD_DAP = `Les soins à l’origine de ce déplacement sont liés à votre maladie de longue durée reconnue par l’Assurance Maladie. Vous présentez aussi des difficultés de déplacement. ${DISTANCE}`;
const MINEUR_DAP = `Les soins à l’origine de ce déplacement sont liés à votre maladie de longue durée reconnue par l’Assurance Maladie. Votre besoin de soins continus pendant plus de six mois est reconnu par l’Assurance Maladie. Vous présentez aussi des difficultés de déplacement. ${DISTANCE}`;

describe("les mêmes patients à plus de 150 km : l'accord préalable", () => {
  it.each([
    ["ald-confirmee", AVEC_UN_PROFESSIONNEL(["2_ALD"]), ALD_DAP],
    [
      "mineur-sans-ald",
      AVEC_UN_PROFESSIONNEL(["8_MINEUR_SOINS_CONTINUS"]),
      MINEUR_DAP,
    ],
    [
      "ald-et-mineur",
      AVEC_UN_PROFESSIONNEL(["2_ALD", "8_MINEUR_SOINS_CONTINUS"]),
      ALD_DAP,
    ],
  ])(
    "%s : un transport sanitaire sous réserve de l'accord",
    (_id, reponses, raison) => {
      const { issue, texte } = demande({ ...reponses, ...SANS_URGENCE });
      expect(issue).toBe("ISSUE_DAP_SANS_URGENCE");
      expect(texte?.titreDuPatient).toBe(
        "Votre transport sanitaire peut être pris en charge sous réserve de l’accord préalable de l’Assurance Maladie",
      );
      expect(texte?.raison).toBe(raison);
      expect(texte?.cartes.map((carte) => carte.retenue)).toEqual([
        false,
        true,
        false,
      ]);
      expect(texte?.rappel).toMatch(/^La prise en charge de votre transport/);
    },
  );

  it.each([
    ["proche-ald-confirmee-vp", ["2_ALD"], "1_VEHICULE_PERSONNEL"],
    ["proche-ald-confirmee-tc", ["2_ALD"], "2_TRANSPORTS_EN_COMMUN"],
    [
      "proche-mineur-confirme-vp",
      ["8_MINEUR_SOINS_CONTINUS"],
      "1_VEHICULE_PERSONNEL",
    ],
  ] as const)(
    "%s : le titre de la prise en charge du proche",
    (_id, cas, trajet) => {
      const { texte } = demande({
        ...AVEC_UN_PROCHE([...cas], trajet),
        ...SANS_URGENCE,
      });
      expect(texte?.titreDuPatient).toBe(
        "Votre transport peut être pris en charge sous réserve de l’accord préalable de l’Assurance Maladie",
      );
      expect(texte?.consignes.etapes.map(({ titre }) => titre)).toEqual([
        "Conditions de prises en charge",
        "Comment être remboursé ?",
      ]);
    },
  );

  it("avec une urgence attestée en Q2.3.4 : pas d'attente", () => {
    const { issue, texte } = demande({
      ...AVEC_UN_PROFESSIONNEL(["2_ALD"]),
      ...URGENCE_ATTESTEE,
    });
    expect(issue).toBe("ISSUE_DAP_URGENCE_ATTESTEE");
    expect(texte?.rappel).toMatch(/^L’urgence de votre transport/);
    expect(texte?.consignes.etapes[0]?.titre).toBe("Aussi tôt que possible");
  });
});
