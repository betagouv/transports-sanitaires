// Étape 1 — extract : piloté par mapping.json. Pour chaque fichier déclaré, applique
// l'adaptateur de son format → lignes normalisées (build/extract/trajets/<label>.csv) et,
// pour les référentiels, la dimension établissements (build/extract/etablissements.csv).
// Toute la connaissance propre à une source vit dans son adaptateur ; le reste du
// pipeline est générique et ne connaît que les rôles.

import { join } from "node:path";
import type {
  EtablissementRow,
  GhtRattachementRow,
  TrajetRow,
} from "../contrats.ts";
import { Csv } from "../csv.ts";
import { normaliserFiness } from "../finess.ts";
import { Mapping } from "../mapping.ts";
import { Paths } from "../paths.ts";
import type { AdapterOutput, FormatRegistry, MappingEntry } from "../types.ts";
import { FORMATS } from "./adapteurs/registry.ts";

export class Extract {
  readonly #formats: FormatRegistry;

  constructor(formats: FormatRegistry) {
    this.#formats = formats;
  }

  execute(): void {
    const results = Mapping.load().map((entry) => this.#runAdapter(entry));
    this.#writeTrajets(results);
    this.#writeEtablissements(results);
    this.#writeGht(results);
  }

  #runAdapter(entry: MappingEntry): Result {
    const AdapterClass = this.#formats[entry.format];
    if (!AdapterClass)
      throw new Error(`Format inconnu dans le mapping : « ${entry.format} ».`);
    const output = this.#normaliser(
      new AdapterClass(entry.location, entry).execute(),
    );
    console.log(
      `extract ${entry.label.padEnd(14)} [${entry.role}] : ${output.trajets.length} lignes`,
    );
    return { entry, output };
  }

  // Le zéro de tête des finess se rétablit ici, une fois pour toutes les sources : c'est un
  // défaut de transport de la donnée, pas une particularité de format qui vaudrait à
  // chaque adaptateur de la connaître.
  #normaliser(output: AdapterOutput): AdapterOutput {
    return {
      trajets: output.trajets.map(finessDuTrajet),
      etablissements: output.etablissements?.map(finessDeLEtablissement),
      ght: output.ght?.map(finessDuRattachement),
    };
  }

  #writeTrajets(results: Result[]): void {
    for (const { entry, output } of results)
      Csv.write(
        join(Paths.EXTRACT_TRAJETS, `${entry.label}.csv`),
        output.trajets as unknown as Row[],
      );
  }

  #writeEtablissements(results: Result[]): void {
    const etablissements = results.flatMap(
      (r) => r.output.etablissements ?? [],
    );
    Csv.write(
      join(Paths.EXTRACT, "etablissements.csv"),
      etablissements as unknown as Row[],
    );
    console.log(
      `extract etablissements       : ${etablissements.length} lignes`,
    );
  }

  #writeGht(results: Result[]): void {
    const ght = results.flatMap((r) => r.output.ght ?? []);
    if (ght.length === 0) return; // aucune source referentiel-ght déclarée
    Csv.write(join(Paths.EXTRACT, "ght.csv"), ght as unknown as Row[]);
    console.log(
      `extract ght                  : ${ght.length} finess juridiques rattachés`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`)
  new Extract(FORMATS).execute();

// ---- implémentation ----

type Row = Record<string, string | number>;
interface Result {
  entry: MappingEntry;
  output: AdapterOutput;
}

function finessDuTrajet(t: TrajetRow): TrajetRow {
  return {
    ...t,
    finess_juridique: normaliserFiness(t.finess_juridique),
    finess_geographique: normaliserFiness(t.finess_geographique),
  };
}

function finessDeLEtablissement(e: EtablissementRow): EtablissementRow {
  return {
    ...e,
    finess_juridique: normaliserFiness(e.finess_juridique),
    finess_geographique: normaliserFiness(e.finess_geographique),
  };
}

function finessDuRattachement(g: GhtRattachementRow): GhtRattachementRow {
  return { ...g, finess_juridique: normaliserFiness(g.finess_juridique) };
}
