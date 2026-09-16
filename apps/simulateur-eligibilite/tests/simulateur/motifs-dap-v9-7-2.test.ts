// Ce qui appelle un accord préalable **sans** que la distance ni la série y
// soient pour quelque chose : les situations particulières, et ce que l'urgence
// en change.
//
// La série et les seuils de distance sont dans `accord-prealable-v9-7-2.test.ts`.
// Ici, deux familles de la matrice v9.7 : DAP-* et URGENCE-*.

import { describe, expect, it } from "vitest";
import { evaluerLeCas } from "./livrable-v9-7-2";
import { DAP } from "./situations-v9-7-2";

describe("matrice v9.7 — les motifs d’accord préalable et l’urgence", () => {
  it.each([
    ["camsp_cmpp", true],
    ["samsah", false],
  ] as const)("DAP-%s", (situation, camsp) => {
    const moteur = evaluerLeCas({
      special: { [`p2_special_${situation}`]: "oui" },
    });
    expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
    // Le formulaire ne dit qu'un motif : la cible de chacun reste distincte.
    expect(moteur.evaluate("cible_dap_motif_camsp_cmpp").nodeValue).toBe(camsp);
  });

  it.each(["Appel au SAMU - Centre 15", "Autre urgence médicale attestée"])(
    "URGENCE-%s",
    (urgency) => {
      // L'urgence ne change pas le document — le motif réglementaire tient —,
      // elle dispense d'en attendre la décision.
      const moteur = evaluerLeCas({ distance: 2, urgency });
      expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(DAP);
      expect(
        moteur.evaluate("cible_attente_accord_prealable_requise").nodeValue,
      ).toBe(false);
      expect(moteur.evaluate("cible_resultat_2_couleur").nodeValue).toBe(
        "bleu",
      );
    },
  );
});
