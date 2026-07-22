// Format « plateforme au niveau établissement » (CSV UTF-16 tabulé).
//
// Colonnes fixes (cf. constantes) ; les colonnes finess varient d'un fichier à l'autre →
// passées en options du mapping : { colFinessJuridique: number, colFinessGeographique: number }.

import { Csv } from "../../csv.ts";
import type { TrajetRow } from "../../contrats.ts";
import type { Adapter, AdapterOutput, Enveloppe, MappingEntry, VehiculeCanonique } from "../../types.ts";

// Index (0-based) des colonnes fixes de ce format.
const COL_ENVELOPPE = 2;
const COL_ANNEE = 3;
const COL_VEHICULE = 4;
const COL_NB_TRAJETS = 5;
// Une ligne exploitable porte toutes les colonnes ci-dessus (la dernière est l'index 5).
const NB_COLONNES_MIN = 6;
// Sentinelle : un finess géographique valant « 0 » signifie « non renseigné ».
const FINESS_GEOGRAPHIQUE_ABSENT = "0";

const VEHICULE: Record<string, VehiculeCanonique> = {
  Ambulance: "Ambulance",
  Taxi: "Assis",
  VSL: "Assis",
  TAP: "Assis",
};

export class AdapterPlateformeFinessTsv implements Adapter {
  readonly #location: string;
  readonly #entry: MappingEntry;
  readonly #colJuridique: number;
  readonly #colGeographique: number;

  constructor(location: string, entry: MappingEntry) {
    this.#location = location;
    this.#entry = entry;
    this.#colJuridique = AdapterPlateformeFinessTsv.#colOption(entry, "colFinessJuridique");
    this.#colGeographique = AdapterPlateformeFinessTsv.#colOption(entry, "colFinessGeographique");
  }

  execute(): AdapterOutput {
    const trajets: TrajetRow[] = [];
    for (const cells of Csv.readUtf16Tsv(this.#location)) {
      const trajet = this.#toTrajet(cells);
      if (trajet) trajets.push(trajet);
    }
    return { trajets };
  }

  #toTrajet(cells: string[]): TrajetRow | null {
    if (cells.length < NB_COLONNES_MIN) return null;
    const juridique = cells[this.#colJuridique] ?? "";
    const geographique = cells[this.#colGeographique] ?? "";
    if (!juridique && !geographique) return null; // ligne d'agrégat sans finess
    const nb = Number(cells[COL_NB_TRAJETS]);
    if (!Number.isFinite(nb) || nb <= 0) return null;
    return this.#build(cells, juridique, geographique, nb);
  }

  #build(cells: string[], juridique: string, geographique: string, nb: number): TrajetRow {
    return {
      role: this.#entry.role,
      source: this.#entry.label,
      finess_juridique: juridique,
      finess_geographique: geographique === FINESS_GEOGRAPHIQUE_ABSENT ? "" : geographique,
      ght_libelle: "",
      enveloppe: AdapterPlateformeFinessTsv.#toEnveloppe(cells[COL_ENVELOPPE] ?? ""),
      annee: cells[COL_ANNEE] ?? "",
      vehicule_canonique: this.#vehicule(cells[COL_VEHICULE] ?? ""),
      nb_trajets: nb,
    };
  }

  #vehicule(source: string): VehiculeCanonique {
    const canonique = VEHICULE[source];
    if (!canonique)
      throw new Error(`Véhicule non mappé : ${JSON.stringify(source)} (${this.#entry.label}).`);
    return canonique;
  }

  static #toEnveloppe(value: string): Enveloppe {
    if (value === "Article 80" || value === "Hors Article 80") return value;
    throw new Error(`Enveloppe inattendue : ${JSON.stringify(value)}`);
  }

  static #colOption(entry: MappingEntry, key: string): number {
    const value = entry.options[key];
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0)
      throw new Error(`options.${key} attendu (index de colonne entier ≥ 0) pour ${entry.label}.`);
    return value;
  }
}
