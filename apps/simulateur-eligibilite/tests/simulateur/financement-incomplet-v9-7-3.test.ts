// Ce qui laisse le financement indécis, part de la matrice de non-régression du
// livrable v9.7.1 (tmp/9.7.1/tests/financement.mjs). La grille des convocations
// et les deux issues sans convocation sont dans `financement-v9-7-3.test.ts`.

import { describe, expect, it } from "vitest";
import { attendFinancementComplet, CORE } from "./financement-v9-7-3";
import { evaluerLeCas, situationDuLivrable } from "./livrable-v9-7-3";
import { moteurDeTest } from "./moteur";

const BASES = {
  PMT: { reason: "Entrée en hospitalisation" },
  DAP: { distance: 2 as const },
  S3141: { reason: "Permission temporaire de sortie" },
};

const CHAMPS_A_RETIRER = [
  "p2_trajet_depart",
  "p2_depart_adresse",
  "p2_arrivee_nom_lieu",
  "p2_arrivee_adresse",
  "p2_tranche_distance_trajet_aller",
] as const;

describe("matrice v9.7.1 — ce qui laisse le financement indécis", () => {
  for (const [id, options] of Object.entries(BASES)) {
    describe(id, () => {
      it.each(CHAMPS_A_RETIRER)("FINANCEMENT-INCOMPLET-%s", (champ) => {
        // Le côté « Domicile » d'une permission (S3141) est l'arrivée, pas le
        // départ : sa réponse « nom de lieu » se lit donc côté départ.
        const cle =
          id === "S3141" && champ === "p2_arrivee_nom_lieu"
            ? "p2_depart_nom_lieu"
            : champ;
        const situation = situationDuLivrable(options);
        delete situation[cle];
        const moteur = moteurDeTest(situation);
        expect(
          moteur.evaluate("cible_resultat_2_affichable").nodeValue,
        ).not.toBe(true);
        expect(moteur.evaluate("cible_regime_financement").nodeValue).not.toBe(
          "Assurance Maladie",
        );
      });

      it("FINANCEMENT-DOMICILE-SANS-NOM", () => {
        // Le nom du lieu, lui, ne l'est pas : Domicile n'en a pas besoin pour
        // que le financement se décide.
        const complet = evaluerLeCas(options);
        const situation = situationDuLivrable(options);
        delete situation[
          id === "S3141" ? "p2_arrivee_nom_lieu" : "p2_depart_nom_lieu"
        ];
        const moteur = moteurDeTest(situation);
        attendFinancementComplet(moteur);
        expect(moteur.evaluate("cible_cas_final").nodeValue).toBe(
          complet.evaluate("cible_cas_final").nodeValue,
        );
      });
    });
  }

  // FINANCEMENT-AVANT-REPONSE ne se transpose pas au moteur seul : retirer la
  // seule réponse à « cas réglementaire » laisse le reste d'une situation par
  // défaut (Examen médical) se décider normalement — « est défini » range
  // l'absence en « non », pas en indécis. La garde réelle tient à l'ordre du
  // parcours (`etapes.ts`), pas au moteur.

  it("FINANCEMENT-ORDRE-EVALUATION", () => {
    // L'ordre dans lequel les cibles sont d'abord lues ne doit rien changer au
    // financement final — publicodes mémoïse, mais un cache mal posé pourrait
    // figer une valeur partielle.
    const situation = situationDuLivrable({ autonomy: 0 });
    for (const premiere of CORE) {
      const moteur = moteurDeTest(situation);
      moteur.evaluate(premiere);
      attendFinancementComplet(moteur);
    }
  });
});
