// Un test et un fichier du modèle valent pour le modèle en cours, quel que soit
// son numéro. Ni un nom de fichier, ni un `describe`, ni un `it` ne portent la
// version du modèle. Intégrer une version met les contenus et les attendus à
// jour, sans rien renommer. Voir le skill `implement-publicodes-version`.
//
// Les identifiants du livrable gardent leur numéro : c'est leur nom chez
// l'éditeur.

import { readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";
import { racine, sources, texteDe } from "./inspection-des-sources";

describe("ni la recette ni le modèle ne portent de version", () => {
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

  it("aucun fichier du modèle n'a de version dans son nom", () => {
    const fautifs = fichiersDe("front/model").filter((fichier) =>
      VERSION_DANS_UN_NOM.test(basename(fichier)),
    );
    expect(
      fautifs,
      "`front/model/` est le modèle en cours : `rules/regles.publicodes`, et " +
        "non `rules/regles-v10.publicodes`. Livrer une version remplace des " +
        "contenus. Renommer les fichiers casserait les imports et " +
        "l'historique pour dire ce que le CHANGELOG dit déjà.",
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

// Un séparateur, « v », puis un numéro : `-v9-7-3`, `.v10.0.0`, `-v10`.
const VERSION_DANS_UN_NOM = /[-._]v\d+([-.]\d+)*(?=[-._]|$)/;
const VERSION_DANS_UN_TITRE = /\bv\d+\.\d+/;
const TITRE =
  /\b(?:describe|it|test)(?:\.each\((?:[^()]|\([^()]*\))*\))?\(\s*(["'`])((?:(?!\1).)*)\1/gs;

function titresDe(texte: string): string[] {
  return [...texte.matchAll(TITRE)].map((trouve) => trouve[2] ?? "");
}

// Tous les fichiers d'un dossier, quelle que soit leur extension : les règles
// du modèle ne sont pas du TypeScript.
function fichiersDe(dossier: string): string[] {
  return readdirSync(join(racine, dossier), { recursive: true }).map(
    (fichier) => `${dossier}/${String(fichier)}`,
  );
}
