// Les conventions d'écriture, rendues exécutables.
//
// Elles étaient jusqu'ici de la prose dans AGENTS.md — et déjà violées : neuf
// fichiers ouvraient sur un `import` plutôt que sur leur contrat, un helper
// privé était une flèche déclarée au milieu du fichier, des types de domaine
// portaient des noms anglais. Une convention que rien ne vérifie se dégrade à
// la vitesse où elle s'écrit.
//
// Comme dans `architecture.test.ts`, chaque règle porte son *pourquoi* dans son
// message d'échec — c'est là, et nulle part ailleurs, qu'on l'apprend au moment
// utile.

import { basename } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import {
  astDe,
  identifiantsDe,
  lignesDe,
  resoudre,
  segments,
  sources,
  specificateursDe,
  texteDe,
} from "./inspection-des-sources";

const RACINES = ["front", "server", "shared", "scripts"];
const MARQUEUR = "// ---- implémentation ----";
// Une liste de données se lit d'un seul tenant : elle n'a pas d'implémentation
// à cacher. Même exemption que pour la limite de 300 lignes.
const DONNEES = ["front/outils-produit/seeds/catalogue.ts"];

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
        aDuPrive(fichier) &&
        aDuPublic(fichier) &&
        !texteDe(fichier).includes(MARQUEUR),
    );
    expect(
      sans,
      `Passé 80 lignes, un fichier qui mêle exports et privés se lit mal : ` +
        `place \`${MARQUEUR}\` après le dernier export, et tout ce qui est ` +
        `privé en dessous. Le lecteur doit pouvoir s'arrêter au marqueur.`,
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

  it("les identifiants sont en français", () => {
    const anglicismes = sources(...RACINES).flatMap((fichier) =>
      identifiantsDe(fichier)
        .filter(({ nom }) => !TOLERES.has(nom))
        .filter(({ nom }) => segments(nom).some((s) => ANGLICISMES.has(s)))
        .map(({ nom, ligne }) => `${fichier}:${ligne} — ${nom}`),
    );
    expect(
      anglicismes,
      "Le domaine se dit en français : `moteur`, `passation`, `casesRetenues`. " +
        "L'anglais est réservé à ce qu'une API tierce nomme déjà ainsi " +
        "(`handleX`, `useX`, `Props`, `track*`, `Engine`, `FormBuilder`) — et " +
        "c'est l'inscription dans `TOLERES`, ici, qui l'autorise.",
    ).toEqual([]);
  });
});

describe("les extensions d'import suivent le runtime", () => {
  // Node exécute le TypeScript en effaçant les types : il lui faut le vrai nom
  // de fichier. Vite, lui, résout. La frontière n'est donc pas un dossier mais
  // une accessibilité — d'où ce calcul de fermeture transitive plutôt qu'une
  // liste de chemins qui se périmerait au premier `import()` ajouté.
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
        "`scripts/`, ou la chaîne que `npm run apercu-cerfa` tire dans " +
        "`front/`). Node ne résout pas les extensions : écris `.ts` / `.tsx`, " +
        "sinon l'import casse à l'exécution — sans que Vite ni `tsc` le voient.",
    ).toEqual([]);
  });

  it("le reste du front importe sans extension", () => {
    // Une cible elle-même joignable depuis Node est tolérée : écrire son
    // extension anticipe le jour où `apercu-cerfa.ts` la tirera aussi, et ne
    // coûte rien à Vite. Ce qu'on refuse, c'est le mélange entre fichiers qui
    // ne verront jamais Node.
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

// Les noms anglais que le code a réellement portés, plus ceux qui reviennent
// naturellement sous les doigts. Cette liste croît quand un anglicisme passe
// entre les mailles — pas quand il devient gênant.
const ANGLICISMES = new Set([
  "item",
  "items",
  "label",
  "text",
  "name",
  "value",
  "values",
  "get",
  "set",
  "list",
  "title",
  "path",
  "result",
  "count",
  "add",
  "remove",
  "update",
  "delete",
  "send",
  "load",
  "save",
  "helper",
  "helpers",
  "util",
  "utils",
  "field",
  "fields",
]);

// Ce que nomme une API tierce, et que renommer casserait ou obscurcirait.
// Toute entrée ici est une dérogation : elle se justifie, elle ne s'ajoute pas
// pour faire passer le test.
const TOLERES = new Set([
  // React / DSFR : la forme des props est imposée par le composant appelé.
  "Props",
  // `@publicodes/forms` : le vocabulaire de son modèle de formulaire, qu'on
  // relaie tel quel plutôt que d'entretenir une table de traduction.
  "page",
  "pages",
  "pageCount",
  "formState",
  "setFormState",
  // Grist : un enregistrement y est un `rowId` et un objet `fields`. Le segment
  // `row` n'est pas dans la liste noire pour cette raison — il n'apparaît chez
  // nous que composé avec l'identifiant Grist (`etabRowId`, `serviceRowId`).
  "fields",
]);

function aDuPrive(fichier: string): boolean {
  return astDe(fichier).statements.some(
    (noeud) => estUneDeclaration(noeud) && !estExporte(noeud),
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
 * Les fichiers qu'une exécution Node peut atteindre : les trois racines qui lui
 * appartiennent, plus tout ce qu'elles tirent de proche en proche — y compris
 * dans `front/`, via `scripts/apercu-cerfa.ts`.
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
