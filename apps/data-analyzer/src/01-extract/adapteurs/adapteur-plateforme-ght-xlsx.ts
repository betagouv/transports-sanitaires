// Format « plateforme au niveau GHT » (xlsx, en-têtes multi-niveaux, sans finess).
//
// Structure (publique) : colonne A = libellé GHT libre ; colonnes de valeurs fixes (cf.
// constantes), colonnes de montants ignorées. Lignes 0-2 = en-têtes ; ligne « Total » ignorée.

import { Xlsx } from "./shared.ts";
import type { TrajetRow } from "../../contrats.ts";
import type { Adapter, AdapterOutput, Enveloppe, MappingEntry, VehiculeCanonique } from "../../types.ts";

const PREMIERE_LIGNE_DONNEES = 3; // lignes 0-2 = en-têtes
const COLONNE_LIBELLE_GHT = 0; // colonne A
const LIBELLE_LIGNE_TOTAL = "total"; // ligne récapitulative à ignorer (insensible à la casse)

const ANNEES = ["2023", "2024"] as const;

// Article 80 : total (sans détail véhicule), une colonne par année.
const COLONNES_ART80_TOTAL: Record<string, string> = { "2023": "B", "2024": "C" };

// Hors Article 80 : détail par véhicule canonique, une colonne par année.
const COLONNES_HORS_ART80: { vehicule: VehiculeCanonique; colonnes: Record<string, string> }[] = [
  { vehicule: "Assis", colonnes: { "2023": "P", "2024": "Q" } }, // Taxi
  { vehicule: "Assis", colonnes: { "2023": "R", "2024": "S" } }, // VSL
  { vehicule: "Ambulance", colonnes: { "2023": "T", "2024": "U" } },
  { vehicule: "Autre", colonnes: { "2023": "V", "2024": "W" } }, // TPMR
];

export class AdapterPlateformeGhtXlsx implements Adapter {
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
    const ght = Xlsx.str(ws, r, COLONNE_LIBELLE_GHT);
    if (!ght || ght.toLowerCase() === LIBELLE_LIGNE_TOTAL) return;
    for (const annee of ANNEES) this.#collectYear(ws, r, ght, annee, trajets);
  }

  #collectYear(ws: XlsxSheet, r: number, ght: string, annee: string, trajets: TrajetRow[]): void {
    this.#add(trajets, ght, "Article 80", annee, "Total", this.#value(ws, r, COLONNES_ART80_TOTAL[annee]!));
    for (const { vehicule, colonnes } of COLONNES_HORS_ART80)
      this.#add(trajets, ght, "Hors Article 80", annee, vehicule, this.#value(ws, r, colonnes[annee]!));
  }

  #value(ws: XlsxSheet, r: number, letter: string): number {
    return Xlsx.num(ws, r, Xlsx.col(letter));
  }

  #add(
    trajets: TrajetRow[],
    ght: string,
    enveloppe: Enveloppe,
    annee: string,
    vehicule: VehiculeCanonique,
    nb: number,
  ): void {
    if (nb <= 0) return;
    trajets.push({
      role: this.#entry.role,
      source: this.#entry.label,
      finess_juridique: "",
      finess_geographique: "",
      ght_libelle: ght,
      enveloppe,
      annee,
      vehicule_canonique: vehicule,
      nb_trajets: nb,
    });
  }
}

type XlsxSheet = ReturnType<typeof Xlsx.sheet>;
