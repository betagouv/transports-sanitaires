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

import { describe } from "vitest";
import { type Cas, rejouerLaMatrice } from "./matrice";
import {
  ALD,
  AUTONOME,
  HOSPITALISATION,
  NON_ELIGIBLE,
  PMT,
  PRO,
  PROCHE,
  SMUR,
  TPMR,
  VSL,
} from "./situations-v9-5-1";

const PRESTATION_NON_PRISE_EN_CHARGE =
  "prestation non prise en charge par l’Assurance Maladie";

// `null` retire la clé de la situation : voir `Reponses` dans `situations-v9-5-1`.
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
      cible_transport_sanitaire_prescrit:
        "véhicule personnel ou transport en commun",
      cible_cas_final: PMT,
    },
  },
  {
    // La séance ne valide plus l'ALD : `p1_ald_validee` exige une incapacité ou
    // une déficience, et rien d'autre. Elle ouvre droit de son côté, en motif
    // indépendant — d'où une PMT alors que l'ALD n'est pas retenue.
    id: "ALD-003",
    given: { p1_autonomie: AUTONOME, ...ALD, p1_m0_seance: "oui" },
    expect: {
      p1_ald_incapacite_ou_deficience: false,
      p1_ald_validee: false,
      cible_cas_final: PMT,
    },
  },
  {
    id: "PRESTA-001",
    given: {
      p1_autonomie: PRO,
      p1_critere_oxygene: "oui",
      p2_prestation_prise_en_charge_assurance_maladie: "non",
    },
    expect: {
      cible_transport_sanitaire_prescrit: "ambulance",
      cible_cas_final: "prestation non prise en charge par l’Assurance Maladie",
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  // ACTES-TARIFES-001 : un acte non tarifé ferme la prise en charge du
  // transport, quel que soit le mode que la Partie 1 a verrouillé. PRESTA-001
  // couvre l'ambulance ; les trois autres modes valent d'être vus aussi.
  {
    id: "ACTES-TARIFES-001 · TPMR",
    given: {
      p1_autonomie: PRO,
      p1_critere_fauteuil_sans_transfert: "oui",
      p2_prestation_prise_en_charge_assurance_maladie: "non",
    },
    expect: {
      cible_transport_sanitaire_prescrit: TPMR,
      cible_cas_final: PRESTATION_NON_PRISE_EN_CHARGE,
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "ACTES-TARIFES-001 · VSL ou taxi conventionné",
    given: {
      p1_autonomie: PRO,
      p1_critere_hygiene_desinfection: "oui",
      p2_prestation_prise_en_charge_assurance_maladie: "non",
    },
    expect: {
      cible_transport_sanitaire_prescrit: VSL,
      cible_cas_final: PRESTATION_NON_PRISE_EN_CHARGE,
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "ACTES-TARIFES-001 · véhicule personnel",
    given: {
      p1_autonomie: AUTONOME,
      p2_prestation_prise_en_charge_assurance_maladie: "non",
    },
    expect: {
      cible_transport_sanitaire_prescrit:
        "véhicule personnel ou transport en commun",
      cible_cas_final: PRESTATION_NON_PRISE_EN_CHARGE,
      cible_document_a_remettre_au_patient: "aucun document",
    },
  },
  {
    id: "MOTIF-001",
    given: { p1_autonomie: PRO, p1_critere_aide_professionnel: "oui" },
    expect: {
      cible_transport_sanitaire_prescrit: VSL,
      p2_motif_ouvrant_droit: false,
      cible_cas_final: NON_ELIGIBLE,
    },
  },
  {
    id: "AMBULANCE-001",
    given: { p1_autonomie: PRO, p1_critere_oxygene: "oui", ...HOSPITALISATION },
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
    id: "ACCOMPAGNANT-001 · proche accompagnant",
    given: { p1_autonomie: PROCHE, ...HOSPITALISATION },
    expect: { cible_accompagnant_necessaire: true },
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
    id: "ACCOMPAGNANT-001 · urgence vitale SMUR",
    given: { p1_autonomie: SMUR },
    expect: { cible_accompagnant_necessaire: false },
  },
  {
    id: "ACCOMPAGNANT-001 · Q1 sans réponse",
    given: { p1_autonomie: null, ...HOSPITALISATION },
    expect: { cible_accompagnant_necessaire: undefined },
  },
];

describe("modèle v9.5.1 — le droit ouvert et le mode médical", () => {
  rejouerLaMatrice(matrice);
});
