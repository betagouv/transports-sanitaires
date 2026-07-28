// Format « plateforme au niveau établissement » (xlsx, en-têtes multi-niveaux, avec finess).
//
// Structure : colonne A = finess (juridique), colonne B = nom (ignoré) ; puis des groupes de
// colonnes « une par année ». Lignes 0-1 = en-têtes ; lignes sans finess ignorées.
//  - Article 80 : total seul (pas de détail véhicule) → véhicule canonique « Total ».
//  - Hors Article 80 : un total, puis un détail partiel (taxi/VSL/ambulance). Le reliquat
//    (total − détail) est imputé à « Autre » (TPMR & autres modes) pour que la somme des
//    véhicules égale le total hors art. 80 annoncé.

import { Xlsx } from "./shared.ts";
import type { TrajetRow } from "../../contrats.ts";
import type { Adapter, AdapterOutput, Enveloppe, MappingEntry, VehiculeCanonique } from "../../types.ts";

const PREMIERE_LIGNE_DONNEES = 2; // lignes 0-1 = en-têtes
const COLONNE_FINESS = "A";

const ANNEES = ["2023", "2024", "2025"] as const;

// Article 80 : total (sans détail véhicule), une colonne par année.
const COLONNES_ART80: Record<string, string> = { "2023": "C", "2024": "D", "2025": "E" };

// Hors Article 80 : total, puis détail partiel par véhicule canonique, une colonne par année.
const COLONNES_HORS_TOTAL: Record<string, string> = { "2023": "F", "2024": "G", "2025": "H" };
const COLONNES_HORS_DETAIL: { vehicule: VehiculeCanonique; colonnes: Record<string, string> }[] = [
  { vehicule: "Assis", colonnes: { "2023": "I", "2024": "J", "2025": "K" } }, // Taxi
  { vehicule: "Assis", colonnes: { "2023": "L", "2024": "M", "2025": "N" } }, // VSL
  { vehicule: "Ambulance", colonnes: { "2023": "O", "2024": "P", "2025": "Q" } },
];

export class AdapterPlateformeFinessXlsx implements Adapter {
  readonly #location: string;
  readonly #entry: MappingEntry;

  constructor(location: string, entry: MappingEntry) {
    this.#location = location;
    this.#entry = entry;
  }

  execute(): AdapterOutput {
    const ws = Xlsx.sheet(this.#location);
    const derniere = Xlsx.range(ws).e.r;
    const trajets: TrajetRow[] = [];
    for (let r = PREMIERE_LIGNE_DONNEES; r <= derniere; r++) this.#collectRow(ws, r, trajets);
    return { trajets };
  }

  #collectRow(ws: XlsxSheet, r: number, trajets: TrajetRow[]): void {
    const finess = Xlsx.str(ws, r, Xlsx.col(COLONNE_FINESS));
    if (!finess) return;
    for (const annee of ANNEES) this.#collectYear(ws, r, finess, annee, trajets);
  }

  #collectYear(ws: XlsxSheet, r: number, finess: string, annee: string, trajets: TrajetRow[]): void {
    this.#add(trajets, finess, "Article 80", annee, "Total", this.#value(ws, r, COLONNES_ART80[annee]!));
    this.#collectHorsArt80(ws, r, finess, annee, trajets);
  }

  // Détail hors art. 80 : véhicules connus, puis reliquat imputé à « Autre ».
  #collectHorsArt80(ws: XlsxSheet, r: number, finess: string, annee: string, trajets: TrajetRow[]): void {
    let detaille = 0;
    for (const { vehicule, colonnes } of COLONNES_HORS_DETAIL) {
      const nb = this.#value(ws, r, colonnes[annee]!);
      detaille += nb;
      this.#add(trajets, finess, "Hors Article 80", annee, vehicule, nb);
    }
    const reliquat = this.#value(ws, r, COLONNES_HORS_TOTAL[annee]!) - detaille;
    this.#add(trajets, finess, "Hors Article 80", annee, "Autre", reliquat);
  }

  #value(ws: XlsxSheet, r: number, letter: string): number {
    return Xlsx.num(ws, r, Xlsx.col(letter));
  }

  #add(
    trajets: TrajetRow[],
    finess: string,
    enveloppe: Enveloppe,
    annee: string,
    vehicule: VehiculeCanonique,
    nb: number,
  ): void {
    if (nb <= 0) return;
    trajets.push({
      role: this.#entry.role,
      source: this.#entry.label,
      finess_juridique: finess,
      finess_geographique: "",
      ght_libelle: "",
      enveloppe,
      annee,
      vehicule_canonique: vehicule,
      nb_trajets: nb,
    });
  }
}

type XlsxSheet = ReturnType<typeof Xlsx.sheet>;
