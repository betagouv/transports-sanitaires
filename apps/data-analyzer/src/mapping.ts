// Chargement et validation de mapping.json — le seul endroit qui lie des fichiers réels
// (et l'identité de leurs fournisseurs) à un rôle et à un format. Ce fichier n'est PAS
// versionné ; mapping.example.json en est le gabarit neutre.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join } from "node:path";
import type { MappingEntry, Role } from "./types.ts";

const ROLES: readonly Role[] = ["plateforme", "referentiel-national"];

export class Mapping {
  static load(): MappingEntry[] {
    const raw = Mapping.#read();
    if (!Array.isArray(raw)) throw new Error("mapping.json doit être un tableau d'entrées.");
    const labels = new Set<string>();
    return raw.map((item, i) => Mapping.#toEntry(item, i, labels));
  }

  static #read(): unknown {
    const path = join(Mapping.#appRoot(), "mapping.json");
    try {
      return JSON.parse(readFileSync(path, "utf8"));
    } catch (err) {
      throw new Error(
        `Impossible de lire ${path}. Copiez mapping.example.json en mapping.json et ` +
          `renseignez vos fichiers. Détail : ${(err as Error).message}`,
      );
    }
  }

  static #toEntry(item: unknown, i: number, labels: Set<string>): MappingEntry {
    const e = item as Partial<MappingEntry>;
    Mapping.#validate(e, i, labels);
    return {
      role: e.role!,
      format: e.format!,
      location: Mapping.#resolve(e.location!),
      label: e.label!,
      options: e.options ?? {},
    };
  }

  static #validate(e: Partial<MappingEntry>, i: number, labels: Set<string>): void {
    if (!e.role || !ROLES.includes(e.role))
      throw new Error(`mapping.json[${i}].role invalide (attendu : ${ROLES.join(" | ")}).`);
    if (!e.format) throw new Error(`mapping.json[${i}].format manquant.`);
    if (!e.location) throw new Error(`mapping.json[${i}].location manquant.`);
    if (!e.label) throw new Error(`mapping.json[${i}].label manquant.`);
    if (labels.has(e.label)) throw new Error(`mapping.json : label en double « ${e.label} ».`);
    labels.add(e.label);
  }

  static #resolve(location: string): string {
    return isAbsolute(location) ? location : join(Mapping.#appRoot(), location);
  }

  static #appRoot(): string {
    return join(dirname(fileURLToPath(import.meta.url)), "..");
  }
}
