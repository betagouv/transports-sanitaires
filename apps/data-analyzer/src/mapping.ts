// Chargement et validation de mapping.json — le seul endroit qui lie des fichiers réels
// (et l'identité de leurs fournisseurs) à un rôle et à un format. Ce fichier n'est PAS
// versionné ; mapping.example.json en est le gabarit neutre.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, isAbsolute, join } from "node:path";
import type { MappingEntry, Role } from "./types.ts";

const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROLES: readonly Role[] = ["plateforme", "referentiel-national"];

export function loadMapping(): MappingEntry[] {
  const path = join(appRoot, "mapping.json");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    throw new Error(
      `Impossible de lire ${path}. Copiez mapping.example.json en mapping.json et ` +
        `renseignez vos fichiers. Détail : ${(err as Error).message}`,
    );
  }
  if (!Array.isArray(raw)) throw new Error("mapping.json doit être un tableau d'entrées.");

  const labels = new Set<string>();
  return raw.map((item, i) => {
    const e = item as Partial<MappingEntry>;
    if (!e.role || !ROLES.includes(e.role))
      throw new Error(`mapping.json[${i}].role invalide (attendu : ${ROLES.join(" | ")}).`);
    if (!e.format) throw new Error(`mapping.json[${i}].format manquant.`);
    if (!e.location) throw new Error(`mapping.json[${i}].location manquant.`);
    if (!e.label) throw new Error(`mapping.json[${i}].label manquant.`);
    if (labels.has(e.label)) throw new Error(`mapping.json : label en double « ${e.label} ».`);
    labels.add(e.label);
    return {
      role: e.role,
      format: e.format,
      location: isAbsolute(e.location) ? e.location : join(appRoot, e.location),
      label: e.label,
      options: e.options ?? {},
    };
  });
}
