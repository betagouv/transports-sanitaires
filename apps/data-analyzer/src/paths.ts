// Chemins des dossiers de l'ETL, résolus depuis l'emplacement de ce fichier
// (indépendant du répertoire courant d'où l'on lance les scripts).

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// L'emplacement des sources d'entrée est configurable : voir config.ts / config.json.
export const REF = join(root, "ref"); // référentiels figés (versionnés)
export const BUILD = join(root, "build"); // artefacts ETL (versionnés)

export const EXTRACT = join(BUILD, "extract");
export const EXTRACT_TRAJETS = join(EXTRACT, "trajets"); // 1 CSV normalisé par source
export const STAGING = join(BUILD, "staging");
export const RECONCILE = join(BUILD, "reconcile");
export const MARTS = join(BUILD, "marts");
