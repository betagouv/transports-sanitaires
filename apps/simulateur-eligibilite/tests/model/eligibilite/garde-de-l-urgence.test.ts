// La garde d'affichage de Q2.3.4, rejouée contre les règles : les états
// partiels et les paires finales de `tests/test_urgence_q234_a.mjs` du paquet.
//
// Un état partiel est ce qu'on sait à la page du trajet : P1, la distance, et
// ce que les pages d'avant ont établi. Tout le reste est absent, et la garde
// ne le lit pas comme un « non ». Les identifiants sont ceux de l'éditeur.

import { describe, expect, it } from "vitest";
import { cibles } from "../../../front/models/eligibilite/evaluation-des-regles";
import {
  ABSENTS,
  type Changements,
  faitsDe,
  preconiser,
} from "./faits-de-l-oracle";

const P1: Changements = {
  fait_p1_complete: true,
  fait_autonomie_professionnel: true,
  fait_critere_tap: false,
  fait_critere_fauteuil: false,
  fait_critere_allonge: false,
  fait_critere_brancard: true,
  fait_critere_surveillance: false,
  fait_critere_oxygene: false,
  fait_critere_asepsie: false,
  fait_bariatrique: false,
};
const LOIN: Changements = { ...P1, fait_distance_plus_150: true };
const SANS_DAP: Changements = {
  fait_distance_plus_150: false,
  fait_distance_plus_50: false,
  fait_serie_qualifiante: false,
  fait_avion_bateau_ligne: false,
  fait_motif_camsp: false,
  fait_dap_maternite: false,
};
const EXCEPTIONS_ECARTEES = Object.fromEntries(
  Object.keys(ABSENTS)
    .filter((fait) => fait.startsWith("fait_exception_article80_"))
    .map((fait) => [fait, false]),
) as Changements;
const TRANSFERT: Changements = { ...LOIN, fait_transfert_article80: true };

const ETATS_PARTIELS: readonly [string, Changements, boolean][] = [
  ["trajet-200km-partiel", LOIN, true],
  [
    "convocation-non-encore-posee",
    {
      ...LOIN,
      fait_transfert_article80: false,
      fait_permission_charge_patient: false,
      fait_centre15_interetablissements: false,
      fait_motif_samsah: false,
      fait_motif_pension: false,
      fait_exclusion_transport_prouvee: false,
    },
    true,
  ],
  ["avion-partiel", { ...P1, fait_avion_bateau_ligne: true }, true],
  [
    "serie-partielle",
    {
      ...P1,
      fait_distance_plus_50: true,
      fait_serie_qualifiante: true,
      fait_ald_liee: false,
    },
    true,
  ],
  ["camsp-partiel", { ...P1, fait_motif_camsp: true }, true],
  ["maternite-partielle", { ...P1, fait_dap_maternite: true }, true],
  ["distance-et-avion", { ...LOIN, fait_avion_bateau_ligne: true }, true],
  ["absence-dap", { ...P1, ...SANS_DAP }, false],
  ["etranger-seul", { ...P1, ...SANS_DAP, fait_trajet_etranger: true }, false],
  ["etranger-et-distance", { ...LOIN, fait_trajet_etranger: true }, true],
  [
    "transfert-connu-sans-exception",
    { ...TRANSFERT, ...EXCEPTIONS_ECARTEES },
    false,
  ],
  ["transfert-exceptions-inconnues", TRANSFERT, true],
  [
    "transfert-exception-prouvee",
    { ...TRANSFERT, fait_exception_article80_air_mer: true },
    true,
  ],
  [
    "permission-charge-patient",
    { ...LOIN, fait_permission_charge_patient: true },
    false,
  ],
  [
    "centre15-connu",
    { ...LOIN, fait_centre15_interetablissements: true },
    false,
  ],
  ["samsah-connu", { ...LOIN, fait_motif_samsah: true }, false],
  ["pension-connue", { ...LOIN, fait_motif_pension: true }, false],
  [
    "htnm-non-verifie-connu",
    {
      ...LOIN,
      fait_htnm_hors_maternite: true,
      fait_htnm_segment_verifie: false,
    },
    false,
  ],
  ["htnm-segment-inconnu", { ...LOIN, fait_htnm_hors_maternite: true }, true],
  [
    "exclusion-transport-prouvee",
    { ...LOIN, fait_exclusion_transport_prouvee: true },
    false,
  ],
  ["convocation-prouvee-avec-dap", { ...LOIN, fait_convocation: true }, true],
];

const partiel = (faits: Changements) =>
  cibles(faitsDe({ ...ABSENTS, ...faits }));

describe("la garde de Q2.3.4, à la page du trajet", () => {
  it.each(ETATS_PARTIELS)("%s", (_id, faits, affichee) => {
    const rendu = partiel(faits);
    expect(rendu.cible_question_urgence_a_afficher).toBe(affichee);
    expect(
      rendu.cible_issue_id,
      "Aucune issue ne se décide avant la fin de P2.",
    ).toBeUndefined();
  });
});

const MOTIFS_DE_DAP: readonly [string, Changements][] = [
  ["distance", { fait_distance_plus_150: true }],
  ["avion", { fait_avion_bateau_ligne: true }],
  ["serie", { fait_distance_plus_50: true, fait_serie_qualifiante: true }],
];

describe("l'urgence, une fois P2 complète", () => {
  it.each(MOTIFS_DE_DAP)("%s : attestée ou non, une DAP", (_motif, motif) => {
    for (const urgence of [true, false]) {
      const rendu = preconiser({
        ...P1,
        ...motif,
        fait_urgence_attestee: urgence,
        fait_urgence_repondue: true,
      });
      expect(rendu.cible_issue_id).toBe(
        urgence ? "ISSUE_DAP_URGENCE_ATTESTEE" : "ISSUE_DAP_SANS_URGENCE",
      );
      expect(rendu.cible_support_id).toBe("S3139h");
    }
  });

  it.each(MOTIFS_DE_DAP)("%s : sans réponse, aucune issue", (_motif, motif) => {
    expect(
      preconiser({
        ...P1,
        ...motif,
        fait_urgence_attestee: undefined,
        fait_urgence_repondue: undefined,
      }).cible_issue_id,
    ).toBeUndefined();
  });
});
