// Les contrôles EM-2 de l'éditeur sur la composition du texte médical
// (`tests/elements-medicaux.mjs`), rejoués sous leurs identifiants `EM-*`.
// Les autres `EM-*` portent leur identifiant dans les tests des tickets 12 et
// 13 (`tests/cerfa/texte-medical-integral.test.ts`,
// `tests/cerfa/revision-texte-medical.test.tsx`,
// `tests/simulateur/nombre-iteratif-pmt.test.ts`).

import { describe, expect, it } from "vitest";
import { composerElementsMedicaux } from "../../front/outils-produit/beta/cerfa/elements-medicaux/composition";
import { reponsesDe } from "../../front/outils-produit/beta/cerfa/reponses";
import { moteur } from "../../front/simulateur/moteur";
import { type OptionsDuLivrable, situationDuLivrable } from "./livrable";

const CLINIQUE: OptionsDuLivrable = {
  criterion: "p1_critere_brancardage_portage",
};

describe("EM-2, la composition", () => {
  it.each(["Entrée en hospitalisation", "Sortie d’hospitalisation"])(
    "EM-TYPE-HOSPITALISATION-RETIRE-%s",
    (reason) => {
      const texteMedical = composer({
        ...CLINIQUE,
        reason,
        ...(reason.startsWith("Sortie")
          ? { depart: "Structure de soins", arrival: "Domicile" }
          : {}),
      });
      expect(texteMedical.startsWith(`${reason} ; `)).toBe(true);
      expect(texteMedical).not.toMatch(
        /hospitalisation (complète|partielle)|ambulatoire/i,
      );
    },
  );

  it("EM-SEPARATEUR-SANS-PERTE-SAUTS-SAISIS", () => {
    // Nos saisies libres tiennent sur une ligne (`<input>`) : un saut de ligne
    // saisi ne peut pas atteindre le texte. Reste le fond du contrôle : le
    // séparateur « ; » joint les blocs sans rien retirer de la saisie.
    const justification = "Plateau indisponible ; second motif, sans perte.";
    const texteMedical = composer({
      distance: 2,
      overrides: { p2_justification_longue_distance: `'${justification}'` },
    });
    expect(texteMedical).toContain(
      `Justification du trajet de plus de 150 km : ${justification}`,
    );
    expect(texteMedical).not.toContain("\n");
  });
});

// ---- implémentation ----

function composer(options: OptionsDuLivrable): string {
  const situation = situationDuLivrable(options);
  return composerElementsMedicaux(reponsesDe(moteur, situation));
}
