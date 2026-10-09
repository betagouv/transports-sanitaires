// Les `.env` du dépôt : y lire un réglage de tsp, trouver ceux qui manquent
// face à leur gabarit.

import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import { scopes } from "./apps.ts";

/**
 * La valeur d'un réglage, ou rien s'il est absent ou vide. L'environnement
 * passe avant le `.env` de la racine.
 */
export function setting(root: string, key: string): string | undefined {
  return process.env[key] || fromFile(root)[key] || undefined;
}

/** Les `.env` absents alors que leur `.env.example` existe, relatifs à la racine. */
export function missingEnvFiles(root: string): string[] {
  return scopes(root)
    .map((scope) => path.join(scope.dir, ".env"))
    .filter((file) => fs.existsSync(path.join(root, `${file}.example`)))
    .filter((file) => !fs.existsSync(path.join(root, file)));
}

// ---- implémentation ----

function fromFile(root: string): NodeJS.Dict<string> {
  const file = path.join(root, ".env");
  return fs.existsSync(file) ? parseEnv(fs.readFileSync(file, "utf8")) : {};
}
