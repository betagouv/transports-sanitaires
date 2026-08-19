// Mart « part » générique : `part = Σ plateformes / référentiel` (hors Article 80), à un
// grain donné (finess géographique, finess juridique, ou GHT). Le grain et les colonnes
// d'identité sont fournis par l'appelant ; le calcul, lui, ne connaît que les rôles.
//
// `part` vide (NULL) quand le référentiel n'a pas de valeur en face ; `alerte_qualite =
// "part>1"` quand le numérateur dépasse le dénominateur (signal de qualité, non corrigé).

import { join } from "node:path";
import type { CelluleRatio, TrajetReconcilieRow } from "../contrats.ts";
import { Csv } from "../csv.ts";
import { Paths } from "../paths.ts";
import type { VehiculeCanonique } from "../types.ts";

export interface MartRatioConfig {
  fichier: string; // nom du CSV produit dans build/marts/
  log: string; // libellé affiché
  grain: (t: TrajetReconcilieRow) => string; // valeur de clé, "" pour ignorer la ligne
  identite: (cle: string) => Row; // colonnes d'identité (clé + libellés), forme fixe
}

interface Accu {
  nb_plateforme: number;
  nb_reference: number;
}

export class MartRatio {
  readonly #config: MartRatioConfig;

  constructor(config: MartRatioConfig) {
    this.#config = config;
  }

  execute(trajets: TrajetReconcilieRow[]): void {
    const rows = this.calculer(trajets);
    Csv.write(join(Paths.MARTS, this.#config.fichier), rows);
    this.#report(rows);
  }

  /** Le calcul pur (sans écriture), pour le test comme pour `execute`. */
  calculer(trajets: TrajetReconcilieRow[]): Row[] {
    return this.#construire(this.#agreger(trajets));
  }

  #agreger(trajets: TrajetReconcilieRow[]): Map<string, Accu> {
    const cellules = new Map<string, Accu>();
    for (const t of trajets) this.#accumuler(cellules, t);
    return cellules;
  }

  #accumuler(cellules: Map<string, Accu>, t: TrajetReconcilieRow): void {
    if (t.enveloppe !== "Hors Article 80") return;
    const grain = this.#config.grain(t);
    if (!grain) return;
    const accu = this.#accu(
      cellules,
      `${grain}|${t.annee}|${t.vehicule_canonique}`,
    );
    if (t.role === "referentiel-national")
      accu.nb_reference += Number(t.nb_trajets);
    else if (t.role === "plateforme")
      accu.nb_plateforme += Number(t.nb_trajets);
  }

  #accu(cellules: Map<string, Accu>, cle: string): Accu {
    const connu = cellules.get(cle);
    if (connu) return connu;
    const accu: Accu = { nb_plateforme: 0, nb_reference: 0 };
    cellules.set(cle, accu);
    return accu;
  }

  #construire(cellules: Map<string, Accu>): Row[] {
    return [...cellules.entries()]
      .sort(([a], [b]) => a.localeCompare(b)) // grain, puis année, puis véhicule
      .map(([cle, accu]) => this.#toRow(cle, accu));
  }

  #toRow(cle: string, accu: Accu): Row {
    const [grain, annee, vehicule] = cle.split("|") as [
      string,
      string,
      VehiculeCanonique,
    ];
    return {
      ...this.#config.identite(grain),
      ...this.#cellule(annee, vehicule, accu),
    };
  }

  #cellule(
    annee: string,
    vehicule: VehiculeCanonique,
    accu: Accu,
  ): CelluleRatio {
    const part =
      accu.nb_reference > 0
        ? Number((accu.nb_plateforme / accu.nb_reference).toFixed(4))
        : "";
    return {
      annee,
      vehicule,
      nb_plateforme: accu.nb_plateforme,
      nb_reference: accu.nb_reference,
      part,
      alerte_qualite: typeof part === "number" && part > 1 ? "part>1" : "",
    };
  }

  #report(rows: Row[]): void {
    const sansDenominateur = rows.filter((r) => r.part === "").length;
    const anomalies = rows.filter((r) => r.alerte_qualite === "part>1").length;
    console.log(
      `marts ${this.#config.log.padEnd(15)}: ${rows.length} lignes (${sansDenominateur} sans dénominateur, ${anomalies} part>1)`,
    );
  }
}

// ---- implémentation ----

type Row = Record<string, string | number>;
