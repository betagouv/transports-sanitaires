// Étape 2 — staging : réunit les lignes normalisées de toutes les sources (les
// adaptateurs ont déjà traduit vers la nomenclature canonique) et les agrège au grain
// complet, en sommant les trajets. Sortie : build/staging/trajets.csv.

import { readdirSync } from "node:fs";
import { join } from "node:path";
import { Csv } from "../csv.ts";
import { Paths } from "../paths.ts";
import type { TrajetRow } from "../contrats.ts";

type Row = Record<string, string | number>;

export class Staging {
  execute(): void {
    const rows = this.#aggregate(this.#readAll());
    Csv.write(join(Paths.STAGING, "trajets.csv"), rows as unknown as Row[]);
    console.log(`staging trajets              : ${rows.length} lignes`);
  }

  #readAll(): TrajetRow[] {
    const files = readdirSync(Paths.EXTRACT_TRAJETS).filter((f) => f.endsWith(".csv"));
    return files.flatMap((f) => this.#readFile(join(Paths.EXTRACT_TRAJETS, f)));
  }

  #readFile(path: string): TrajetRow[] {
    return Csv.read(path).map((raw) => ({ ...raw, nb_trajets: Number(raw.nb_trajets) }) as unknown as TrajetRow);
  }

  #aggregate(rows: TrajetRow[]): TrajetRow[] {
    const parCle = new Map<string, TrajetRow>();
    for (const row of rows) this.#accumulate(parCle, row);
    return [...parCle.values()];
  }

  #accumulate(parCle: Map<string, TrajetRow>, row: TrajetRow): void {
    const cle = this.#cle(row);
    const existante = parCle.get(cle);
    if (existante) existante.nb_trajets += row.nb_trajets;
    else parCle.set(cle, row);
  }

  #cle(t: TrajetRow): string {
    return [
      t.role, t.source, t.finess_juridique, t.finess_geographique,
      t.ght_libelle, t.enveloppe, t.annee, t.vehicule_canonique,
    ].join("|");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) new Staging().execute();
