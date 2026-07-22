// Étape 3 — reconcile : pose les clés qui rendent les sources jointables.
//
// Itération 1 (niveau établissement) : la clé est le finess juridique, déjà présent dans
// les lignes normalisées. reconcile se limite à consolider la **dimension établissements**
// émise par les référentiels : un finess juridique regroupe plusieurs sites (finess
// géographiques) ; on retient l'identité du site au plus gros volume (`score`) comme
// libellé représentatif.
//
// Le rattachement finess → GHT (pour mart_ght) dépendra du référentiel data.gouv
// `etablissements-de-sante-par-ght` (ref/ght.csv) : voir la spec.

import { existsSync } from "node:fs";
import { join } from "node:path";
import { readCsv, writeCsv } from "../csv.ts";
import { EXTRACT, RECONCILE, REF } from "../paths.ts";
import type { EtablissementDimensionRow, EtablissementRow } from "../contrats.ts";

function buildEtablissements(): void {
  const parJuridique = new Map<string, EtablissementRow>();
  for (const raw of readCsv(join(EXTRACT, "etablissements.csv"))) {
    const row = { ...raw, score: Number(raw.score) } as unknown as EtablissementRow;
    const current = parJuridique.get(row.finess_juridique);
    if (!current || row.score > current.score) parJuridique.set(row.finess_juridique, row);
  }

  const rows: EtablissementDimensionRow[] = [...parJuridique.values()].map((e) => ({
    finess_juridique: e.finess_juridique,
    nom: e.nom,
    ville: e.ville,
    departement: e.departement,
    categorie: e.categorie,
  }));
  writeCsv(join(RECONCILE, "etablissements.csv"), rows as unknown as Record<string, string | number>[]);
  console.log(`reconcile etablissements     : ${rows.length} établissements`);
}

export function reconcile(): void {
  buildEtablissements();
  if (!existsSync(join(REF, "ght.csv"))) {
    console.log("reconcile ght                : différé (ref/ght.csv absent — cf. spec, mart_ght)");
  }
}

if (import.meta.url === `file://${process.argv[1]}`) reconcile();
