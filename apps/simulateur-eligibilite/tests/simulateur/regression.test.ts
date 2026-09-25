// Le droit ouvert et le mode médical, part de la matrice de non-régression du
// livrable v9.5.1 (tmp/9.5.1/…/transports-sanitaires.tests.v9-5-1.yaml).
//
// Ce que la Partie 1 tranche, et ce qui ouvre — ou ferme — la prise en charge :
// l'ALD et ses conditions cumulatives, l'acte non tarifé qui l'emporte sur tout
// mode verrouillé, le motif ouvrant droit, la priorité de l'ambulance, et
// l'accompagnant que Q1 désigne. La charge de l'établissement est dans
// `article-80-v9-5-1.test.ts`, l'accord préalable et le trajet dans
// `accord-prealable-v9-5-1.test.ts`.
//
// Les assertions purement UI de la matrice (avancement automatique,
// verrouillage, contenus interdits) ne sont nulle part ici : elles relèvent des
// tests d'interface.

import { describe, expect, it } from "vitest";
import { type Cas, rejouerLaMatrice } from "./matrice";
import { moteurDeTest } from "./moteur";
import {
  ALD,
  AUTONOME,
  DAP,
  HOSPITALISATION,
  NON_ELIGIBLE,
  PMT,
  PRO,
  PROCHE,
  VSL,
} from "./situations";

// `null` retire la clé de la situation : voir `Reponses` dans `situations`.
const matrice: Cas[] = [
  {
    id: "ALD-001",
    given: { p1_autonomie: AUTONOME, ...ALD },
    expect: { p1_ald_validee: false, cible_cas_final: NON_ELIGIBLE },
  },
  {
    // La v9.5.0 avait fait basculer ce cas en DAP : la réponse « proche » de Q1
    // y valait accompagnement par un tiers, motif d'accord préalable à elle
    // seule. La v9.5.1 le retire, et le livrable le dit maintenant en toutes
    // lettres — PMT hors autre motif réglementaire.
    id: "ALD-002",
    given: { p1_autonomie: PROCHE, ...ALD },
    expect: {
      p1_ald_incapacite_ou_deficience: true,
      p1_ald_validee: true,
      cible_transport_sanitaire_prescrit: "véhicule personnel",
      cible_cas_final: PMT,
    },
  },
  {
    // La séance ne valide plus l'ALD : `p1_ald_validee` exige une incapacité ou
    // une déficience, et rien d'autre. Elle ouvre droit de son côté, en motif
    // indépendant — d'où une PMT alors que l'ALD n'est pas retenue.
    id: "ALD-003",
    given: {
      p1_autonomie: AUTONOME,
      ...ALD,
      p1_m0_seance_chimiotherapie: "oui",
    },
    expect: {
      p1_ald_incapacite_ou_deficience: false,
      p1_ald_validee: false,
      cible_cas_final: PMT,
    },
  },
  {
    id: "MOTIF-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_aide_professionnel: "oui",
      p1_critere_aucun: "non",
    },
    expect: {
      cible_transport_sanitaire_prescrit: VSL,
      p2_motif_ouvrant_droit: false,
      cible_cas_final: NON_ELIGIBLE,
    },
  },
  {
    id: "AMBULANCE-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_oxygene: "oui",
      p1_critere_aucun: "non",
      ...HOSPITALISATION,
    },
    expect: {
      cible_transport_sanitaire_prescrit: "ambulance",
      p2_accord_prealable_requis: false,
      cible_cas_final: PMT,
    },
  },
  {
    // ACCOMPAGNANT-001 : la cible réintroduite en v9.2.1, qui remplace la
    // dérivation que l'application tenait depuis Q1. Ses quatre états — dont
    // l'absence de valeur avant réponse, qui interdit un « non » par défaut.
    // Depuis la v9.5.1, le livrable y ajoute ce que cette réponse ne fait
    // *pas* : elle produit une PMT, et jamais une DAP.
    id: "ACCOMPAGNANT-001 · proche accompagnant",
    given: { p1_autonomie: PROCHE, ...HOSPITALISATION },
    expect: { cible_accompagnant_necessaire: true, cible_cas_final: PMT },
  },
  {
    id: "ACCOMPAGNANT-001 · autonome",
    given: { p1_autonomie: AUTONOME, ...HOSPITALISATION },
    expect: { cible_accompagnant_necessaire: false },
  },
  {
    id: "ACCOMPAGNANT-001 · aide d’un professionnel",
    given: { p1_autonomie: PRO, ...HOSPITALISATION },
    expect: { cible_accompagnant_necessaire: false },
  },
  {
    id: "ACCOMPAGNANT-001 · Q1 sans réponse",
    given: { p1_autonomie: null, ...HOSPITALISATION },
    expect: { cible_accompagnant_necessaire: undefined },
  },
  // Les deux cas que la v9.5.1 ajoute pour verrouiller sa correction : le besoin
  // d'un proche n'est plus une cause d'accord préalable, et ne masque pas non
  // plus celles qui en sont.
  {
    id: "ACCOMPAGNANT-REGRESSION-001",
    given: { p1_autonomie: PROCHE, ...HOSPITALISATION },
    expect: {
      cible_accompagnant_necessaire: true,
      p2_accord_prealable_requis: false,
      cible_cas_final: PMT,
      cible_document_a_remettre_au_patient: "PMT S3138g",
    },
  },
  {
    id: "ACCOMPAGNANT-REGRESSION-002",
    given: {
      p1_autonomie: PROCHE,
      ...HOSPITALISATION,
      p2_tranche_distance_trajet_aller: "'Plus de 150 km'",

      p2_justification_longue_distance:
        "'Plateau technique spécialisé indisponible à moins de 150 km.'",
    },
    expect: {
      cible_accompagnant_necessaire: true,
      cible_dap_motif_longue_distance: true,
      cible_dap_motif_serie: false,
      cible_cas_final: DAP,
    },
  },
];

describe("le droit ouvert et le mode médical", () => {
  rejouerLaMatrice(matrice);
});

// PRESTA-001 et ACTES-TARIFES-001 constataient qu'un acte non tarifé fermait la
// prise en charge du transport, quel que soit le mode verrouillé en Partie 1.
// La v9.7 a retiré la question qui les portait comme le cas final qu'ils
// attendaient : le prescripteur n'est plus interrogé sur la prise en charge de
// la prestation à l'origine du déplacement.
//
// Ces quatre cas n'ont donc plus de situation à décrire. Ce test constate leur
// disparition, et redeviendra rouge le jour où l'éditeur les rouvre — avec, dans
// son message, ce qu'il faut alors rétablir.
describe("PRESTA-001 — la prestation n’est plus interrogée", () => {
  it("ne pose plus la prise en charge de la prestation", () => {
    expect(
      "p2_prestation_prise_en_charge_assurance_maladie" in
        moteurDeTest({}).getParsedRules(),
      "Le modèle a retrouvé la question de la prestation à l'origine du " +
        "déplacement. Rétablis les quatre cas PRESTA-001 et ACTES-TARIFES-001 " +
        "qu'elle portait : un acte non tarifé ferme la prise en charge du " +
        "transport, quel que soit le mode verrouillé en Partie 1.",
    ).toBe(false);
  });

  it("n’a plus « prestation non prise en charge » parmi ses issues", () => {
    const issues = JSON.stringify(
      moteurDeTest({}).getRule("cible_cas_final").rawNode,
    );
    expect(issues).not.toMatch(/prestation non prise en charge/);
  });
});
