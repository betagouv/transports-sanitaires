// Étape 1 — extract : piloté par mapping.json. Pour chaque fichier déclaré, applique
// l'adaptateur de son format → lignes normalisées (build/extract/trajets/<label>.csv) et,
// pour les référentiels, la dimension établissements (build/extract/etablissements.csv).
// Toute la connaissance propre à une source vit dans son adaptateur ; le reste du
// pipeline est générique et ne connaît que les rôles.

import { join } from "node:path";
import { writeCsv } from "../csv.ts";
import { EXTRACT, EXTRACT_TRAJETS } from "../paths.ts";
import { loadMapping } from "../mapping.ts";
import { FORMATS } from "./adapteurs/registry.ts";
import type { EtablissementRow } from "../contrats.ts";

export function extract(): void {
  const mapping = loadMapping();
  const etablissements: EtablissementRow[] = [];

  for (const entry of mapping) {
    const adapter = FORMATS[entry.format];
    if (!adapter) throw new Error(`Format inconnu dans le mapping : « ${entry.format} ».`);
    const { trajets, etablissements: etabs } = adapter(entry.location, entry);
    writeCsv(
      join(EXTRACT_TRAJETS, `${entry.label}.csv`),
      trajets as unknown as Record<string, string | number>[],
    );
    if (etabs) etablissements.push(...etabs);
    console.log(`extract ${entry.label.padEnd(14)} [${entry.role}] : ${trajets.length} lignes`);
  }

  writeCsv(
    join(EXTRACT, "etablissements.csv"),
    etablissements as unknown as Record<string, string | number>[],
  );
  console.log(`extract etablissements       : ${etablissements.length} lignes`);
}

if (import.meta.url === `file://${process.argv[1]}`) extract();
