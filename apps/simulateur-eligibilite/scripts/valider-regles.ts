import { readFileSync, globSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve } from "node:path";
import Engine from "publicodes";
import type { RawPublicodes } from "publicodes";
import yaml from "js-yaml";

// Vérifie la validité d'un document publicodes : syntaxe YAML puis
// cohérence des règles (références manquantes, cycles, etc.) via l'Engine.
// Reproduit le chargement de front/simulateur/engine.ts.

const __dirname = dirname(fileURLToPath(import.meta.url));
const reglesDir = resolve(__dirname, "../regles");
const racine = resolve(__dirname, "..");

function main(): void {
  const fichiers = globSync(`${reglesDir}/*.publicodes`).sort();

  if (fichiers.length === 0) {
    throw new Error(`Aucun fichier .publicodes trouvé dans ${relative(racine, reglesDir)}`);
  }

  const rules = validerYaml(fichiers);
  validerPublicodes(rules);
}

// Valide la syntaxe YAML de chaque fichier et retourne les règles fusionnées.
// Lève une erreur décrivant le premier fichier fautif.
function validerYaml(fichiers: string[]): RawPublicodes<string> {
  let rules: RawPublicodes<string> = {};

  for (const fichier of fichiers) {
    const chemin = relative(racine, fichier);
    try {
      const parsed = yaml.load(readFileSync(fichier, "utf8")) as RawPublicodes<string>;
      rules = { ...rules, ...parsed };
      console.log(`✓ YAML valide : ${chemin}`);
    } catch (e) {
      const err = e as { message?: string; mark?: { line: number; column: number } };
      const position = err.mark ? ` (ligne ${err.mark.line + 1}, colonne ${err.mark.column + 1})` : "";
      throw new Error(`Erreur YAML dans ${chemin}${position}\n  ${err.message ?? e}`);
    }
  }

  return rules;
}

// Valide la cohérence des règles en les compilant avec l'Engine publicodes
// (mêmes options que l'app). Lève une erreur en cas de règle invalide.
function validerPublicodes(rules: RawPublicodes<string>): void {
  new Engine(rules, {
    flag: { filterNotApplicablePossibilities: true },
  });
  const nb = Object.keys(rules).length;
  console.log(`\n✓ Document publicodes valide : ${nb} règles compilées sans erreur.`);
}

try {
  main();
} catch (e) {
  console.error(`\n✗ ${(e as Error).message}`);
  process.exit(1);
}
