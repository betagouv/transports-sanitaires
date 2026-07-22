// Chemins des dossiers de l'ETL, résolus depuis l'emplacement de ce fichier
// (indépendant du répertoire courant d'où l'on lance les scripts).
//
// L'emplacement des sources d'entrée est configurable : voir mapping.ts / mapping.json.

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export class Paths {
  static readonly #root = join(dirname(fileURLToPath(import.meta.url)), "..");

  static readonly REF = join(Paths.#root, "ref"); // référentiels publics figés (versionnés)
  static readonly BUILD = join(Paths.#root, "build"); // artefacts ETL (non versionnés)

  static readonly EXTRACT = join(Paths.BUILD, "extract");
  static readonly EXTRACT_TRAJETS = join(Paths.EXTRACT, "trajets"); // 1 CSV normalisé par source
  static readonly STAGING = join(Paths.BUILD, "staging");
  static readonly RECONCILE = join(Paths.BUILD, "reconcile");
  static readonly MARTS = join(Paths.BUILD, "marts");
}
