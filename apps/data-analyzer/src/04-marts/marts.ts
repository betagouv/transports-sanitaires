// Étape 4 — marts : applique la règle de calcul et produit les livrables.
//
// Itération 1 : `mart_etablissement` — part des trajets **hors Article 80** réalisés via
// les plateformes (rôle `plateforme`, à finess), par établissement × année × type.
//   part = Σ plateformes(hors art.80) / référentiel national,  au grain finess juridique
//          × année × véhicule canonique.
// Jointure externe complète : cellules sans dénominateur (années non couvertes) → part "" ;
// cellules du référentiel sans plateforme → part 0. Le calcul ne connaît que des rôles.

import { join } from "node:path";
import { Csv } from "../csv.ts";
import { Paths } from "../paths.ts";
import type { EtablissementDimensionRow, MartEtablissementRow, TrajetRow } from "../contrats.ts";
import type { VehiculeCanonique } from "../types.ts";

type Row = Record<string, string | number>;
interface Cellule {
  nb_plateforme: number;
  nb_reference: number;
}

export class Marts {
  #etablissements = new Map<string, EtablissementDimensionRow>();

  execute(): void {
    this.#etablissements = this.#loadEtablissements();
    const rows = this.#buildRows(this.#aggregate(this.#loadTrajets()));
    Csv.write(join(Paths.MARTS, "mart_etablissement.csv"), rows as unknown as Row[]);
    this.#report(rows);
  }

  #loadTrajets(): TrajetRow[] {
    return Csv.read(join(Paths.STAGING, "trajets.csv")) as unknown as TrajetRow[];
  }

  #loadEtablissements(): Map<string, EtablissementDimensionRow> {
    const rows = Csv.read(join(Paths.RECONCILE, "etablissements.csv")) as unknown as EtablissementDimensionRow[];
    return new Map(rows.map((r) => [r.finess_juridique, r]));
  }

  #aggregate(trajets: TrajetRow[]): Map<string, Cellule> {
    const cellules = new Map<string, Cellule>();
    for (const t of trajets) this.#accumulate(cellules, t);
    return cellules;
  }

  #accumulate(cellules: Map<string, Cellule>, t: TrajetRow): void {
    if (t.enveloppe !== "Hors Article 80" || !t.finess_juridique) return;
    const cellule = this.#cellule(cellules, `${t.finess_juridique}|${t.annee}|${t.vehicule_canonique}`);
    if (t.role === "referentiel-national") cellule.nb_reference += Number(t.nb_trajets);
    else if (t.role === "plateforme") cellule.nb_plateforme += Number(t.nb_trajets);
  }

  #cellule(cellules: Map<string, Cellule>, cle: string): Cellule {
    let cellule = cellules.get(cle);
    if (!cellule) cellules.set(cle, (cellule = { nb_plateforme: 0, nb_reference: 0 }));
    return cellule;
  }

  #buildRows(cellules: Map<string, Cellule>): MartEtablissementRow[] {
    return [...cellules.entries()].map(([cle, c]) => this.#toRow(cle, c)).sort((a, b) => this.#compare(a, b));
  }

  #toRow(cle: string, c: Cellule): MartEtablissementRow {
    const [finess, annee, vehicule] = cle.split("|") as [string, string, VehiculeCanonique];
    const etab = this.#etablissements.get(finess);
    return {
      finess_juridique: finess,
      nom: etab?.nom ?? "",
      ville: etab?.ville ?? "",
      departement: etab?.departement ?? "",
      annee,
      vehicule,
      nb_plateforme: c.nb_plateforme,
      nb_reference: c.nb_reference,
      part: this.#part(c),
    };
  }

  #part(c: Cellule): number | "" {
    return c.nb_reference > 0 ? Number((c.nb_plateforme / c.nb_reference).toFixed(4)) : "";
  }

  #compare(a: MartEtablissementRow, b: MartEtablissementRow): number {
    return (
      a.finess_juridique.localeCompare(b.finess_juridique) ||
      a.annee.localeCompare(b.annee) ||
      a.vehicule.localeCompare(b.vehicule)
    );
  }

  #report(rows: MartEtablissementRow[]): void {
    const sansDenominateur = rows.filter((r) => r.part === "").length;
    const anomalies = rows.filter((r) => typeof r.part === "number" && r.part > 1).length;
    console.log(`marts etablissement          : ${rows.length} lignes (${sansDenominateur} sans dénominateur)`);
    if (anomalies > 0) console.warn(`  ⚠️ ${anomalies} cellules avec part > 1 (à investiguer)`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) new Marts().execute();
