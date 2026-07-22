// Étape 2 — staging : réunit les lignes normalisées de toutes les sources (les
// adaptateurs ont déjà traduit vers la nomenclature canonique) et les agrège au grain
// complet, en sommant les trajets (ex. les véhicules « assis » d'un référentiel se
// replient sur une seule ligne). Sortie : build/staging/trajets.csv.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { readCsv, writeCsv } from "../csv.ts";
import { EXTRACT_TRAJETS, STAGING } from "../paths.ts";
import type { TrajetRow } from "../contrats.ts";

function cle(t: TrajetRow): string {
  return [
    t.role,
    t.source,
    t.finess_juridique,
    t.finess_geographique,
    t.ght_libelle,
    t.enveloppe,
    t.annee,
    t.vehicule_canonique,
  ].join("|");
}

export function staging(): void {
  const agg = new Map<string, TrajetRow>();
  for (const file of readdirSync(EXTRACT_TRAJETS).filter((f) => f.endsWith(".csv"))) {
    for (const raw of readCsv(join(EXTRACT_TRAJETS, file))) {
      const row = { ...raw, nb_trajets: Number(raw.nb_trajets) } as unknown as TrajetRow;
      const key = cle(row);
      const existing = agg.get(key);
      if (existing) existing.nb_trajets += row.nb_trajets;
      else agg.set(key, row);
    }
  }

  const rows = [...agg.values()];
  writeCsv(join(STAGING, "trajets.csv"), rows as unknown as Record<string, string | number>[]);
  console.log(`staging trajets              : ${rows.length} lignes`);
}

if (import.meta.url === `file://${process.argv[1]}`) staging();
