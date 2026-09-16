// Ce que chaque cas final doit au patient en matière de financement — la
// transposition de `assertFinalFunding` (tmp/9.7.1/tests/financement.mjs).
// Partagé par `financement-v9-7-2.test.ts` (la grille des convocations et les
// deux issues sans convocation) et `financement-incomplet-v9-7-2.test.ts` (ce
// qui laisse le financement indécis).

import { expect } from "vitest";
import type { moteurDeTest } from "./moteur";
import {
  CHARGE_ETABLISSEMENT,
  CONVOCATION,
  DAP,
  NON_ELIGIBLE,
  ORIENTATION_CAISSE,
  PMT,
  S3141,
} from "./situations-v9-7-2";

/** Les six cibles qu'une issue tranchée ne doit jamais laisser indécises. */
export const CORE = [
  "cible_cas_final",
  "cible_resultat_2_affichable",
  "cible_document_a_remettre_au_patient",
  "cible_regime_financement",
  "cible_resultat_2_couleur",
  "cible_transport_sanitaire_prescrit",
] as const;

/** Le régime attendu de chacun des huit cas finaux. */
export const REGIME_ATTENDU: Record<string, string> = {
  [CHARGE_ETABLISSEMENT]: "Établissement",
  "permission de sortie sans motif médical": "Patient",
  [CONVOCATION]: "Assurance Maladie",
  [ORIENTATION_CAISSE]:
    "Assurance Maladie - modalités à confirmer auprès de la caisse",
  [NON_ELIGIBLE]: "Absence de prise en charge Assurance Maladie",
  [S3141]: "Assurance Maladie",
  [DAP]: "Assurance Maladie",
  [PMT]: "Assurance Maladie",
};

/** Une issue tranchée, dont le financement est celui que le contrat promet. */
export function attendFinancementComplet(
  moteur: ReturnType<typeof moteurDeTest>,
) {
  expect(moteur.evaluate("cible_resultat_2_affichable").nodeValue).toBe(true);
  const cas = moteur.evaluate("cible_cas_final").nodeValue as string;
  expect(Object.hasOwn(REGIME_ATTENDU, cas), cas).toBe(true);
  expect(moteur.evaluate("cible_regime_financement").nodeValue).toBe(
    REGIME_ATTENDU[cas],
  );
  for (const cle of CORE)
    expect(
      Object.keys(moteur.evaluate(cle).missingVariables ?? {}),
      cle,
    ).toEqual([]);
}
