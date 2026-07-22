// Étape 1 — extract : piloté par mapping.json. Pour chaque fichier déclaré, applique
// l'adaptateur de son format → lignes normalisées (build/extract/trajets/<label>.csv) et,
// pour les référentiels, la dimension établissements (build/extract/etablissements.csv).
// Toute la connaissance propre à une source vit dans son adaptateur ; le reste du
// pipeline est générique et ne connaît que les rôles.

import { join } from "node:path";
import { Csv } from "../csv.ts";
import { Paths } from "../paths.ts";
import { Mapping } from "../mapping.ts";
import { FORMATS } from "./adapteurs/registry.ts";
import type { AdapterOutput, FormatRegistry, MappingEntry } from "../types.ts";

type Row = Record<string, string | number>;
interface Result {
  entry: MappingEntry;
  output: AdapterOutput;
}

export class Extract {
  readonly #formats: FormatRegistry;

  constructor(formats: FormatRegistry) {
    this.#formats = formats;
  }

  execute(): void {
    const results = Mapping.load().map((entry) => this.#runAdapter(entry));
    this.#writeTrajets(results);
    this.#writeEtablissements(results);
  }

  #runAdapter(entry: MappingEntry): Result {
    const AdapterClass = this.#formats[entry.format];
    if (!AdapterClass) throw new Error(`Format inconnu dans le mapping : « ${entry.format} ».`);
    const output = new AdapterClass(entry.location, entry).execute();
    console.log(`extract ${entry.label.padEnd(14)} [${entry.role}] : ${output.trajets.length} lignes`);
    return { entry, output };
  }

  #writeTrajets(results: Result[]): void {
    for (const { entry, output } of results)
      Csv.write(join(Paths.EXTRACT_TRAJETS, `${entry.label}.csv`), output.trajets as unknown as Row[]);
  }

  #writeEtablissements(results: Result[]): void {
    const etablissements = results.flatMap((r) => r.output.etablissements ?? []);
    Csv.write(join(Paths.EXTRACT, "etablissements.csv"), etablissements as unknown as Row[]);
    console.log(`extract etablissements       : ${etablissements.length} lignes`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) new Extract(FORMATS).execute();
