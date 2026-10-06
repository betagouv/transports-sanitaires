// Les conventions d'écriture, rendues exécutables.
//
// Une convention que rien ne vérifie se dégrade. Comme dans
// `architecture.test.ts`, chaque règle donne son pourquoi dans son message
// d'échec.

import { basename } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  astDe,
  lignesDe,
  resoudre,
  sources,
  specificateursDe,
  texteDe,
} from "./inspection-des-sources";

const RACINES = ["front", "server", "shared", "scripts"];
const MARQUEUR = "// ---- implémentation ----";
// Une liste de données se lit d'un seul tenant, sans implémentation à cacher.
// Même exemption que pour la limite de 300 lignes.
const DONNEES = ["front/seeds/catalogue.ts"];

describe("un fichier se lit comme son contrat", () => {
  it("chaque fichier s'ouvre sur un en-tête", () => {
    const sans = sources(...RACINES).filter(
      (fichier) => !texteDe(fichier).trimStart().startsWith("//"),
    );
    expect(
      sans,
      "Un fichier commence par quelques lignes disant *ce qu'il permet de " +
        "faire* — avant les imports, avant les types. Le pourquoi, l'histoire " +
        "et les contraintes descendent à côté du code qu'ils expliquent ; " +
        "l'en-tête, lui, sert au lecteur qui ouvre le fichier sans le connaître.",
    ).toEqual([]);
  });

  it("un fichier qui a du privé le range sous le marqueur d'implémentation", () => {
    const sans = sources(...RACINES).filter(
      (fichier) =>
        !DONNEES.includes(fichier) &&
        lignesDe(fichier) > 80 &&
        aDesFonctionsPrivees(fichier) &&
        aDuPublic(fichier) &&
        !texteDe(fichier).includes(MARQUEUR),
    );
    expect(
      sans,
      `Passé 80 lignes, un fichier qui mêle ce qu'on peut appeler et la façon ` +
        `dont c'est fait se lit mal : place \`${MARQUEUR}\` après le dernier ` +
        `export, et les fonctions privées en dessous. Le lecteur doit pouvoir ` +
        `s'arrêter au marqueur. Un type ou une constante privés dont un export ` +
        `est bâti restent au-dessus : ils font partie du contrat, pas de son ` +
        `implémentation — d'où le fait que seules les fonctions comptent ici.`,
    ).toEqual([]);
  });

  it("les helpers privés sont des fonctions hoistées", () => {
    const fleches = sources(...RACINES).flatMap(fonctionsPriveesEnFleche);
    expect(
      fleches,
      "Un privé sous le marqueur d'implémentation est appelé depuis plus " +
        "haut : en `const` fléché, il n'existe pas encore au moment de " +
        "l'appel (erreur TDZ à l'exécution, que le typecheck ne voit pas). " +
        "Écris `function nom(…) {}`, qui est hoistée.",
    ).toEqual([]);
  });
});

describe("un nom dit une intention", () => {
  it("aucun fichier ne porte un nom de catégorie", () => {
    const categories = /^(utils?|helpers?|commun|acces|shared|misc|divers)$/i;
    const fautifs = sources(...RACINES).filter((fichier) =>
      categories.test(basename(fichier).replace(/\.tsx?$/, "")),
    );
    expect(
      fautifs,
      "Un fichier est nommé d'après une capacité, pas d'après une catégorie. " +
        "Si le nom a besoin d'`utils`, `helpers`, `commun` ou `acces` pour " +
        "fonctionner, le fichier n'a pas d'intention et son contenu " +
        "appartient à ses appelants.",
    ).toEqual([]);
  });
});

describe("les extensions d'import suivent le runtime", () => {
  // Node efface les types et exige le vrai nom de fichier. Vite, lui, résout.
  // La frontière est donc ce que Node peut atteindre, pas un dossier. D'où ce
  // calcul de proche en proche plutôt qu'une liste de chemins.
  const depuisNode = joignablesDepuisNode();

  it("tout ce que Node peut atteindre importe avec l'extension", () => {
    const sans = [...depuisNode].flatMap((fichier) =>
      importsTypeScript(fichier)
        .filter(({ specificateur }) => !/\.tsx?$/.test(specificateur))
        .map(({ specificateur }) => `${fichier} → ${specificateur}`),
    );
    expect(
      sans,
      "Ce fichier est atteignable depuis Node (`server/`, `shared/`, " +
        "`scripts/`, ou ce qu'ils tirent dans " +
        "`front/`). Node ne résout pas les extensions : écris `.ts` / `.tsx`, " +
        "sinon l'import casse à l'exécution — sans que Vite ni `tsc` le voient.",
    ).toEqual([]);
  });

  it("le reste du front importe sans extension", () => {
    // Une cible que Node peut atteindre est tolérée : son extension ne coûte
    // rien à Vite. On refuse le mélange entre fichiers que Node ne verra jamais.
    const avec = sources("front")
      .filter((fichier) => !depuisNode.has(fichier))
      .flatMap((fichier) =>
        importsTypeScript(fichier)
          .filter(
            ({ specificateur, cible }) =>
              /\.tsx?$/.test(specificateur) && !depuisNode.has(cible),
          )
          .map(({ specificateur }) => `${fichier} → ${specificateur}`),
      );
    expect(
      avec,
      "Ce fichier n'est bundlé que par Vite, qui résout les extensions : les " +
        "omettre garde une seule convention par côté, au lieu d'un mélange " +
        "qu'on ne peut plus relire.",
    ).toEqual([]);
  });
});

// ---- implémentation ----

function aDesFonctionsPrivees(fichier: string): boolean {
  return astDe(fichier).statements.some(
    (noeud) => ts.isFunctionDeclaration(noeud) && !estExporte(noeud),
  );
}

function aDuPublic(fichier: string): boolean {
  return astDe(fichier).statements.some(
    (noeud) => estUneDeclaration(noeud) && estExporte(noeud),
  );
}

function fonctionsPriveesEnFleche(fichier: string): string[] {
  const source = astDe(fichier);
  return source.statements
    .filter(ts.isVariableStatement)
    .filter((noeud) => !estExporte(noeud))
    .flatMap((noeud) => noeud.declarationList.declarations)
    .filter(({ initializer }) => initializer && estUneFonction(initializer))
    .map(({ name, pos }) => {
      const { line } = source.getLineAndCharacterOfPosition(pos);
      return `${fichier}:${line + 1} — ${name.getText(source)}`;
    });
}

/**
 * Les fichiers que Node peut atteindre : ses trois racines, plus tout ce
 * qu'elles importent de proche en proche, y compris dans `front/`.
 */
function joignablesDepuisNode(): Set<string> {
  const atteints = new Set(sources("server", "shared", "scripts"));
  const aVisiter = [...atteints];
  while (aVisiter.length > 0) {
    const fichier = aVisiter.pop() as string;
    for (const { cible } of importsTypeScript(fichier)) {
      if (atteints.has(cible)) continue;
      atteints.add(cible);
      aVisiter.push(cible);
    }
  }
  return atteints;
}

/** Les imports relatifs d'un fichier qui désignent vraiment du TypeScript. */
function importsTypeScript(
  fichier: string,
): Array<{ specificateur: string; cible: string }> {
  return specificateursDe(fichier).flatMap((specificateur) => {
    const cible = resoudre(fichier, specificateur);
    return cible ? [{ specificateur, cible }] : [];
  });
}

function estUneDeclaration(noeud: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(noeud) ||
    ts.isVariableStatement(noeud) ||
    ts.isClassDeclaration(noeud) ||
    ts.isTypeAliasDeclaration(noeud) ||
    ts.isInterfaceDeclaration(noeud)
  );
}

function estExporte(noeud: ts.Node): boolean {
  return (
    (ts.getCombinedModifierFlags(noeud as ts.Declaration) &
      ts.ModifierFlags.Export) !==
    0
  );
}

function estUneFonction(noeud: ts.Node): boolean {
  return ts.isArrowFunction(noeud) || ts.isFunctionExpression(noeud);
}
