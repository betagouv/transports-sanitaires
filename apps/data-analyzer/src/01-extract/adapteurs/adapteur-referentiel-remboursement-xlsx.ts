// Format « référentiel de remboursement national » (xlsx à double en-tête).
//
// Structure (publique, non identifiante) :
//  - ligne 0 : libellés de période fusionnés du type « …JJ/AA-JJ/AA » (une par année) ;
//  - ligne 1 : colonnes d'identité (finess, nom, ville, département, catégorie) puis, par
//    période, les véhicules répétés ;
//  - données à partir de la ligne 2.
// Ce référentiel ne couvre que le **hors Article 80** (enveloppe posée en dur ici).

import { Xlsx } from "./shared.ts";
import type { EtablissementRow, TrajetRow } from "../../contrats.ts";
import type { Adapter, AdapterOutput, MappingEntry, VehiculeCanonique } from "../../types.ts";

const LIGNE_PERIODES = 0; // en-tête haut : libellés de période fusionnés
const LIGNE_COLONNES = 1; // en-tête bas : identité + véhicules répétés par période
const PREMIERE_LIGNE_DONNEES = 2;
const SIECLE = 2000; // les périodes notent l'année de fin sur 2 chiffres (« 24 » → 2024)
const PERIODE_ANNEE = /\d{2}\/\d{2}-\d{2}\/(\d{2})/; // capture ces 2 chiffres

const VEHICULE: Record<string, VehiculeCanonique> = {
  Ambulance: "Ambulance",
  VSL: "Assis",
  TP_VSL: "Assis",
  taxi: "Assis",
  "autre mode": "Autre",
};

type IdKey = keyof Omit<EtablissementRow, "score">;
const ID_LABELS: Record<IdKey, string> = {
  finess_juridique: "finess juridique",
  finess_geographique: "finess g",
  nom: "nom de l",
  ville: "ville",
  departement: "département",
  categorie: "catégorie",
};

type XlsxSheet = ReturnType<typeof Xlsx.sheet>;
type ValueCol = { c: number; annee: string; vehicule: string };

export class AdapterReferentielRemboursementXlsx implements Adapter {
  readonly #location: string;
  readonly #entry: MappingEntry;
  readonly #idCols: Partial<Record<IdKey, number>> = {};
  readonly #valueCols: ValueCol[] = [];

  constructor(location: string, entry: MappingEntry) {
    this.#location = location;
    this.#entry = entry;
  }

  execute(): AdapterOutput {
    const ws = Xlsx.sheet(this.#location);
    this.#scanHeader(ws);
    return this.#scanRows(ws);
  }

  #scanHeader(ws: XlsxSheet): void {
    const { s, e } = Xlsx.range(ws);
    let annee = "";
    for (let c = s.c; c <= e.c; c++) annee = this.#scanColumn(ws, c, annee);
  }

  #scanColumn(ws: XlsxSheet, c: number, annee: string): string {
    const periode = Xlsx.str(ws, LIGNE_PERIODES, c).match(PERIODE_ANNEE);
    if (periode) annee = String(SIECLE + Number(periode[1]));
    const label = Xlsx.str(ws, LIGNE_COLONNES, c);
    this.#registerIdCol(label, c);
    if (annee && VEHICULE[label]) this.#valueCols.push({ c, annee, vehicule: label });
    return annee;
  }

  #registerIdCol(label: string, c: number): void {
    for (const [key, needle] of Object.entries(ID_LABELS)) {
      const k = key as IdKey;
      if (this.#idCols[k] === undefined && label.toLowerCase().includes(needle)) this.#idCols[k] = c;
    }
  }

  #scanRows(ws: XlsxSheet): AdapterOutput {
    const derniere = Xlsx.range(ws).e.r;
    const trajets: TrajetRow[] = [];
    const etablissements: EtablissementRow[] = [];
    for (let r = PREMIERE_LIGNE_DONNEES; r <= derniere; r++)
      this.#collectRow(ws, r, trajets, etablissements);
    return { trajets, etablissements };
  }

  #collectRow(ws: XlsxSheet, r: number, trajets: TrajetRow[], etabs: EtablissementRow[]): void {
    const juridique = this.#id(ws, r, "finess_juridique");
    if (!juridique) return;
    const geographique = this.#id(ws, r, "finess_geographique");
    const score = this.#collectTrajets(ws, r, juridique, geographique, trajets);
    etabs.push(this.#etablissement(ws, r, juridique, geographique, score));
  }

  #collectTrajets(ws: XlsxSheet, r: number, jur: string, geo: string, trajets: TrajetRow[]): number {
    let score = 0;
    for (const { c, annee, vehicule } of this.#valueCols) {
      const nb = Xlsx.num(ws, r, c);
      if (nb <= 0) continue;
      score += nb;
      trajets.push(this.#trajet(jur, geo, annee, vehicule, nb));
    }
    return score;
  }

  #trajet(jur: string, geo: string, annee: string, vehicule: string, nb: number): TrajetRow {
    return {
      role: this.#entry.role,
      source: this.#entry.label,
      finess_juridique: jur,
      finess_geographique: geo,
      ght_libelle: "",
      enveloppe: "Hors Article 80",
      annee,
      vehicule_canonique: VEHICULE[vehicule]!,
      nb_trajets: nb,
    };
  }

  #etablissement(ws: XlsxSheet, r: number, jur: string, geo: string, score: number): EtablissementRow {
    return {
      finess_juridique: jur,
      finess_geographique: geo,
      nom: this.#id(ws, r, "nom"),
      ville: this.#id(ws, r, "ville"),
      departement: this.#id(ws, r, "departement"),
      categorie: this.#id(ws, r, "categorie"),
      score,
    };
  }

  #id(ws: XlsxSheet, r: number, key: IdKey): string {
    const c = this.#idCols[key];
    return c === undefined ? "" : Xlsx.str(ws, r, c);
  }
}
