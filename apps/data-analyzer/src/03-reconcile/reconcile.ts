// Étape 3 — reconcile : pose les clés qui rendent les sources jointables.
//
// Itération 1 (niveau établissement) : la clé est le finess juridique, déjà présent dans
// les lignes normalisées. reconcile consolide la **dimension établissements** émise par les
// référentiels : un finess juridique regroupe plusieurs sites ; on retient l'identité du
// site au plus gros volume (`score`) comme libellé représentatif.
//
// Le rattachement finess → GHT (pour mart_ght) s'appuiera sur `build/extract/ght.csv`,
// produit par la source `referentiel-ght` (open data data.gouv `etablissements-de-sante-par-ght`,
// aspiré par `npm run fetch-ght`) : voir la spec.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { Csv } from "../csv.ts";
import { Paths } from "../paths.ts";
import type { EtablissementDimensionRow, EtablissementRow } from "../contrats.ts";

type Row = Record<string, string | number>;

export class Reconcile {
  execute(): void {
    this.#buildEtablissements();
    this.#warnIfGhtManquant();
  }

  #buildEtablissements(): void {
    const representatifs = this.#representatifs(this.#read());
    Csv.write(join(Paths.RECONCILE, "etablissements.csv"), representatifs as unknown as Row[]);
    console.log(`reconcile etablissements     : ${representatifs.length} établissements`);
  }

  #read(): EtablissementRow[] {
    const path = join(Paths.EXTRACT, "etablissements.csv");
    return Csv.read(path).map((raw) => ({ ...raw, score: Number(raw.score) }) as unknown as EtablissementRow);
  }

  #representatifs(rows: EtablissementRow[]): EtablissementDimensionRow[] {
    const parJuridique = new Map<string, EtablissementRow>();
    for (const row of rows) this.#garderMeilleur(parJuridique, row);
    return [...parJuridique.values()].map((e) => this.#toDimension(e));
  }

  #garderMeilleur(parJuridique: Map<string, EtablissementRow>, row: EtablissementRow): void {
    const courant = parJuridique.get(row.finess_juridique);
    if (!courant || row.score > courant.score) parJuridique.set(row.finess_juridique, row);
  }

  #toDimension(e: EtablissementRow): EtablissementDimensionRow {
    return {
      finess_juridique: e.finess_juridique,
      nom: e.nom,
      ville: e.ville,
      departement: e.departement,
      categorie: e.categorie,
    };
  }

  #warnIfGhtManquant(): void {
    if (!existsSync(join(Paths.EXTRACT, "ght.csv")))
      console.log(
        "reconcile ght                : différé (build/extract/ght.csv absent — lancer `npm run fetch-ght` ; cf. spec, mart_ght)",
      );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) new Reconcile().execute();
