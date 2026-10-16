// Les points que les règles laissent ouverts pour la caisse, et le scénario
// de l'éditeur qui dit chacun (D-112).
//
// La trace ne porte qu'une raison, `cible_reason_code`, celle du premier point.
// Les autres se relisent dans les cibles et les faits, aux conditions mêmes
// des règles : `cible_reason_code` les teste dans cet ordre, et
// `cible_point_cnam` regroupe les points propres à la caisse.

import type {
  IssuePraticien,
  ScenarioPraticien,
} from "./declarations/catalogue-resultats";
import type { Trace } from "./trace-du-resultat";

/**
 * Les scénarios des points ouverts, dans l'ordre des règles. Si aucun point
 * ne se relit, le seul scénario qui porte la raison des règles ; sinon aucun,
 * et la fiche n'a que son titre.
 */
export function scenariosDeLaCaisse(
  { scenarios }: IssuePraticien,
  trace: Trace,
): readonly ScenarioPraticien[] {
  const actifs = scenarios.filter(({ inactive }) => !inactive);
  const ouverts = POINTS.filter(([, estOuvert]) => estOuvert(trace)).flatMap(
    ([id]) => actifs.filter((scenario) => scenario.id === id),
  );
  return ouverts.length > 0 ? ouverts : parSaRaison(actifs, trace);
}

// ---- implémentation ----

type Point = readonly [scenario: string, estOuvert: (trace: Trace) => boolean];

// Dans l'ordre de `cible_reason_code`. Les deux scénarios de
// AUTRE_DROIT_NON_VERIFIABLE se séparent comme `cible_couverture_inconnue_decisive`.
const POINTS: readonly Point[] = [
  [
    "ald-base",
    ({ cibles }) => cibles.cible_preuve_ald_inconnue_decisive === true,
  ],
  [
    "mineur",
    ({ cibles }) =>
      cibles.cible_reconnaissance_mineur_inconnue_decisive === true,
  ],
  [
    "appareillage",
    ({ cibles }) => cibles.cible_convocation_inconnue_decisive === true,
  ],
  ["permission-inconnue", permissionInconnue],
  ["transfert-inconnu", transfertInconnu],
  ["samsah", ({ faits }) => faits.fait_motif_samsah.value === true],
  ["pension", ({ faits }) => faits.fait_motif_pension.value === true],
  [
    "centre15",
    ({ faits }) => faits.fait_centre15_interetablissements.value === true,
  ],
  ["htnm", hebergementNonMedicalise],
  ["camsp-urgence", camspEnUrgence],
  ["maternite-urgence", materniteEnUrgence],
];

function permissionInconnue({ cibles, faits }: Trace): boolean {
  return (
    cibles.cible_couverture_inconnue_decisive === true &&
    faits.fait_permission.value === true &&
    faits.fait_permission_mineur_admissible.value === undefined &&
    faits.fait_permission_charge_patient.value === undefined
  );
}

function transfertInconnu({ cibles, faits }: Trace): boolean {
  return (
    cibles.cible_couverture_inconnue_decisive === true &&
    faits.fait_hospitalisation.value === true &&
    faits.fait_transfert_article80.value === undefined
  );
}

function hebergementNonMedicalise({ faits }: Trace): boolean {
  return (
    faits.fait_htnm_hors_maternite.value === true &&
    faits.fait_htnm_segment_verifie.value === false
  );
}

function camspEnUrgence({ cibles, faits }: Trace): boolean {
  return (
    cibles.cible_dap_motif_camsp_cmpp === true &&
    faits.fait_urgence_attestee.value === true
  );
}

function materniteEnUrgence({ faits }: Trace): boolean {
  return (
    faits.fait_dap_maternite.value === true &&
    faits.fait_urgence_attestee.value === true
  );
}

// Un point que les conditions n'ont pas relu : le scénario de la raison des
// règles, s'il est le seul à la porter.
function parSaRaison(
  actifs: readonly ScenarioPraticien[],
  { cibles }: Trace,
): readonly ScenarioPraticien[] {
  const raison = cibles.cible_reason_code;
  const portent = actifs.filter(
    ({ codes }) => codes.length === 1 && codes[0] === raison,
  );
  return portent.length === 1 ? portent : [];
}
