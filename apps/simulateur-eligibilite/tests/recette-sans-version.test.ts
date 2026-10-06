// Un test vaut pour le modèle en cours, quel que soit son numéro. Ni le nom d'un
// fichier de test ni ses `describe`/`it` ne portent la version du modèle.
// Intégrer une version met les attendus à jour, sans rien renommer. Voir le
// skill `implement-publicodes-version`.
//
// Les identifiants du livrable (`CONV971-*`, `RETOURS972-*`, `V973-*`) gardent
// leur version : c'est leur nom chez l'éditeur.

import { basename } from "node:path";
import { describe, expect, it } from "vitest";
import { sources, texteDe } from "./inspection-des-sources";

describe("la recette ne porte pas la version du modèle", () => {
  it("aucun fichier de test n'a de version dans son nom", () => {
    const fautifs = sources("tests").filter((fichier) =>
      VERSION_DANS_UN_NOM.test(basename(fichier)),
    );
    expect(
      fautifs,
      "Un fichier de test vaut pour le modèle en cours : `livrable.ts`, et non " +
        "`livrable-v9-7-3.ts`. Le renommer à chaque version brouille " +
        "l'historique sans rien vérifier de plus.",
    ).toEqual([]);
  });

  it("aucun describe ni it n'annonce une version", () => {
    const fautifs = sources("tests").flatMap((fichier) =>
      titresDe(texteDe(fichier))
        .filter((titre) => VERSION_DANS_UN_TITRE.test(titre))
        .map((titre) => `${fichier} — ${titre}`),
    );
    expect(
      fautifs,
      "Un titre dit ce que le test vérifie, pas la version qui l'a vu naître : " +
        "« matrice du livrable — l'asepsie », et non « matrice v9.7.1 — " +
        "l'asepsie ».",
    ).toEqual([]);
  });
});

// ---- implémentation ----

const VERSION_DANS_UN_NOM = /-v\d+(-\d+)+\b/;
const VERSION_DANS_UN_TITRE = /\bv\d+\.\d+/;
const TITRE =
  /\b(?:describe|it|test)(?:\.each\((?:[^()]|\([^()]*\))*\))?\(\s*(["'`])((?:(?!\1).)*)\1/gs;

function titresDe(texte: string): string[] {
  return [...texte.matchAll(TITRE)].map((trouve) => trouve[2] ?? "");
}
