// Lire les sources de l'application comme des données : la liste des fichiers,
// leur graphe d'imports, leurs fonctions, leurs identifiants. C'est le socle
// commun de `architecture.test.ts` (les frontières) et de `lisibilite.test.ts`
// (la forme). Aucune assertion ici — seulement de quoi en écrire.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const racine = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export type Fonction = { ligne: number; lignes: number };
export type Identifiant = { nom: string; ligne: number };

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
 * Les modules importés par un fichier, résolus en chemins relatifs à la racine
 * (les paquets npm sont ignorés : seules les frontières internes nous occupent).
 * Le chemin garde l'extension telle qu'elle a été écrite — ou son absence.
 */
export function importsDe(fichier: string): string[] {
  return specificateursDe(fichier).map((specificateur) =>
    relative(racine, resolve(dirname(join(racine, fichier)), specificateur)),
  );
}

/**
 * Le fichier TypeScript que désigne un spécificateur, ou `null` s'il en désigne
 * un autre (une feuille de style, un gabarit PDF) ou rien du tout.
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
 * Chaque fonction du fichier avec la taille réelle de son corps, accolades
 * exclues. Les fonctions imbriquées comptent pour elles-mêmes *et* dans leur
 * englobante — sortir un bloc d'une fonction trop longue ne suffit donc pas s'il
 * reste sur place.
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

/**
 * Les noms que le fichier **déclare** : variables, fonctions, paramètres, types
 * et champs de types. Volontairement pas les clés d'objets littéraux ni les
 * attributs JSX — ceux-là portent le plus souvent la forme d'une API tierce
 * (DSFR, `@publicodes/forms`), dont le nommage ne nous appartient pas.
 */
export function identifiantsDe(fichier: string): Identifiant[] {
  const source = astDe(fichier);
  const trouves: Identifiant[] = [];
  const visiter = (noeud: ts.Node) => {
    const nom = nomDeclare(noeud);
    if (nom) {
      const { line } = source.getLineAndCharacterOfPosition(noeud.getStart());
      trouves.push({ nom, ligne: line + 1 });
    }
    ts.forEachChild(noeud, visiter);
  };
  visiter(source);
  return trouves;
}

/** Les segments d'un identifiant : `casesRetenues` → `cases`, `retenues`. */
export function segments(identifiant: string): string[] {
  return identifiant
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_]+/)
    .map((segment) => segment.toLowerCase())
    .filter(Boolean);
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

function nomDeclare(noeud: ts.Node): string | undefined {
  const porteUnNom =
    ts.isVariableDeclaration(noeud) ||
    ts.isFunctionDeclaration(noeud) ||
    ts.isParameter(noeud) ||
    ts.isTypeAliasDeclaration(noeud) ||
    ts.isInterfaceDeclaration(noeud) ||
    ts.isClassDeclaration(noeud) ||
    ts.isPropertySignature(noeud) ||
    ts.isMethodSignature(noeud);
  if (!porteUnNom || !noeud.name || !ts.isIdentifier(noeud.name)) return;
  return noeud.name.text;
}
