// Lit les sources de l'application comme des données : fichiers, imports,
// fonctions. `architecture.test.ts` et `lisibilite.test.ts` s'en servent.
// Aucune assertion ici.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export type Fonction = { ligne: number; lignes: number };

/** Tous les fichiers TypeScript d'un dossier, en chemins relatifs à la racine. */
export function sources(...dossiers: string[]): string[] {
  const trouves: string[] = [];
  const parcourir = (dossier: string) => {
    for (const entree of readdirSync(join(racine, dossier), {
      withFileTypes: true,
    })) {
      const chemin = `${dossier}/${entree.name}`;
      if (entree.isDirectory()) parcourir(chemin);
      else if (/\.tsx?$/.test(entree.name)) trouves.push(chemin);
    }
  };
  for (const dossier of dossiers) parcourir(dossier);
  return trouves;
}

/** Le texte d'un fichier. */
export function texteDe(fichier: string): string {
  return readFileSync(join(racine, fichier), "utf-8");
}

/** Nombre de lignes réelles d'un fichier. */
export function lignesDe(fichier: string): number {
  return texteDe(fichier).split("\n").length;
}

/** L'arbre syntaxique d'un fichier, commentaires compris. */
export function astDe(fichier: string): ts.SourceFile {
  return ts.createSourceFile(
    fichier,
    texteDe(fichier),
    ts.ScriptTarget.Latest,
    true,
  );
}

/** Les spécificateurs relatifs écrits dans un fichier, tels quels. */
export function specificateursDe(fichier: string): string[] {
  return [...texteDe(fichier).matchAll(IMPORT)]
    .map((correspondance) => correspondance[1])
    .filter((specificateur) => specificateur?.startsWith("."))
    .map((specificateur) => specificateur as string);
}

/**
 * Les modules importés par un fichier, en chemins relatifs à la racine. Les
 * paquets npm sont ignorés. L'extension reste telle qu'elle est écrite.
 */
export function importsDe(fichier: string): string[] {
  return specificateursDe(fichier).map((specificateur) =>
    relative(racine, resolve(dirname(join(racine, fichier)), specificateur)),
  );
}

/**
 * Le fichier TypeScript que désigne un spécificateur. `null` s'il désigne autre
 * chose (feuille de style, gabarit PDF) ou rien.
 */
export function resoudre(
  fichier: string,
  specificateur: string,
): string | null {
  const base = relative(
    racine,
    resolve(dirname(join(racine, fichier)), specificateur),
  );
  const candidats = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`];
  return (
    candidats.find((c) => /\.tsx?$/.test(c) && existsSync(join(racine, c))) ??
    null
  );
}

/** Les couples (fichier, import) qui franchissent une frontière interdite. */
export function franchissements(
  depuis: string[],
  vers: (cible: string) => boolean,
): string[] {
  return sources(...depuis).flatMap((fichier) =>
    importsDe(fichier)
      .filter(vers)
      .map((cible) => `${fichier} → ${cible}`),
  );
}

/**
 * Chaque fonction du fichier, avec la taille réelle de son corps sans les
 * accolades. Une fonction imbriquée compte aussi dans celle qui la contient.
 */
export function fonctionsDe(fichier: string): Fonction[] {
  const source = astDe(fichier);
  const trouvees: Fonction[] = [];
  const visiter = (noeud: ts.Node) => {
    const corps = estUneFonction(noeud) ? noeud.body : undefined;
    if (corps && ts.isBlock(corps)) {
      const debut = source.getLineAndCharacterOfPosition(corps.getStart()).line;
      const fin = source.getLineAndCharacterOfPosition(corps.getEnd()).line;
      trouvees.push({ ligne: debut + 1, lignes: fin - debut - 1 });
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(source);
  return trouvees;
}

// ---- implémentation ----

const IMPORT = /(?:from|import)\s*\(?\s*["']([^"']+)["']/g;

type NoeudFonction =
  | ts.FunctionDeclaration
  | ts.FunctionExpression
  | ts.ArrowFunction
  | ts.MethodDeclaration;

function estUneFonction(noeud: ts.Node): noeud is NoeudFonction {
  return (
    ts.isFunctionDeclaration(noeud) ||
    ts.isFunctionExpression(noeud) ||
    ts.isArrowFunction(noeud) ||
    ts.isMethodDeclaration(noeud)
  );
}
