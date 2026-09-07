// Format « plateforme au niveau GHT » (xlsx, en-têtes multi-niveaux, hiérarchique).
//
// Structure (publique) : colonne A = libellé ; colonnes de valeurs fixes (cf. constantes),
// colonnes de montants ignorées. Lignes 0-2 = en-têtes ; ligne « Total » ignorée.
//
// Le fichier est hiérarchique. Une ligne **fille** se reconnaît au préfixe « - » et porte
// son finess juridique entre parenthèses en fin de libellé ; sinon la ligne est un
// **parent**, dont la clé est le libellé libre (rattaché à un GHT plus tard, par reconcile).
//
// Deux règles de lecture, pour ne compter chaque trajet qu'une fois :
//  1. un parent qui a des filles est ignoré, ses filles portent le détail ;
//  2. sauf pour le détail véhicule, que certains parents gardent alors que leurs filles
//     n'en ont aucun. Dans ce cas seul, on retient celui du parent, au niveau du libellé.

import type { TrajetRow } from "../../contrats.ts";
import type {
  Adapter,
  AdapterOutput,
  Enveloppe,
  MappingEntry,
  VehiculeCanonique,
} from "../../types.ts";
import { Xlsx } from "./xlsx.ts";

export class AdapterPlateformeGhtXlsx implements Adapter {
  readonly #location: string;
  readonly #entry: MappingEntry;

  constructor(location: string, entry: MappingEntry) {
    this.#location = location;
    this.#entry = entry;
  }

  execute(): AdapterOutput {
    const ws = Xlsx.sheet(this.#location);
    const trajets: TrajetRow[] = [];
    for (const groupe of this.#grouper(ws))
      this.#collectGroupe(ws, groupe, trajets);
    return { trajets };
  }

  // --- Découpage du fichier en groupes « un parent, ses filles » ---

  #grouper(ws: XlsxSheet): Groupe[] {
    const groupes: Groupe[] = [];
    const derniere = Xlsx.range(ws).e.r;
    for (let r = PREMIERE_LIGNE_DONNEES; r <= derniere; r++)
      this.#classer(ws, r, groupes);
    return groupes;
  }

  #classer(ws: XlsxSheet, r: number, groupes: Groupe[]): void {
    const libelle = Xlsx.str(ws, r, COLONNE_LIBELLE);
    if (!libelle || libelle.toLowerCase() === LIBELLE_LIGNE_TOTAL) return;
    const fille = PREFIXE_FILLE.test(libelle);
    if (fille)
      groupes.at(-1)?.filles.push({ r, finess: this.#finess(libelle) });
    else groupes.push({ r, libelle, filles: [] });
  }

  /** Finess juridique en fin de libellé de fille : « - Aubagne (130781446) ». */
  #finess(libelle: string): string {
    return FINESS_EN_FIN.exec(libelle)?.[1] ?? "";
  }

  // --- Émission des trajets d'un groupe ---

  #collectGroupe(ws: XlsxSheet, groupe: Groupe, trajets: TrajetRow[]): void {
    if (groupe.filles.length === 0) {
      this.#collectLigne(
        ws,
        groupe.r,
        this.#cleLibelle(groupe.libelle),
        trajets,
      );
      return;
    }
    for (const fille of groupe.filles)
      this.#collectLigne(ws, fille.r, this.#cleFille(groupe, fille), trajets);
    if (!this.#fillesOntUnDetailVehicule(ws, groupe))
      this.#collectVehicules(
        ws,
        groupe.r,
        this.#cleLibelle(groupe.libelle),
        trajets,
      );
  }

  #collectLigne(
    ws: XlsxSheet,
    r: number,
    cle: Cle,
    trajets: TrajetRow[],
  ): void {
    for (const annee of ANNEES)
      this.#add(
        trajets,
        cle,
        "Article 80",
        annee,
        "Total",
        this.#value(ws, r, COLONNES_ART80_TOTAL[annee]!),
      );
    this.#collectVehicules(ws, r, cle, trajets);
  }

  #collectVehicules(
    ws: XlsxSheet,
    r: number,
    cle: Cle,
    trajets: TrajetRow[],
  ): void {
    for (const annee of ANNEES)
      for (const { vehicule, colonnes } of COLONNES_HORS_ART80)
        this.#add(
          trajets,
          cle,
          "Hors Article 80",
          annee,
          vehicule,
          this.#value(ws, r, colonnes[annee]!),
        );
  }

  #fillesOntUnDetailVehicule(ws: XlsxSheet, groupe: Groupe): boolean {
    return groupe.filles.some((f) =>
      COLONNES_HORS_ART80.some(({ colonnes }) =>
        ANNEES.some((a) => this.#value(ws, f.r, colonnes[a]!) > 0),
      ),
    );
  }

  // --- Clés ---

  /** Un parent est identifié par son libellé libre, sans finess. */
  #cleLibelle(libelle: string): Cle {
    return { finess_juridique: "", ght_libelle: libelle };
  }

  // Une fille est identifiée par son finess : `ght_libelle` reste vide, elle n'est pas un
  // GHT. Une fille sans finess exploitable retombe sur le libellé de son parent, pour que
  // son volume ne se perde pas ; c'est signalé, le fichier n'est pas censé en contenir.
  #cleFille(groupe: Groupe, fille: Fille): Cle {
    if (fille.finess)
      return { finess_juridique: fille.finess, ght_libelle: "" };
    console.log(
      `extract ${this.#entry.label.padEnd(20)} : fille sans finess ligne ${fille.r + 1}, rattachée au libellé parent`,
    );
    return this.#cleLibelle(groupe.libelle);
  }

  #value(ws: XlsxSheet, r: number, letter: string): number {
    return Xlsx.num(ws, r, Xlsx.col(letter));
  }

  #add(
    trajets: TrajetRow[],
    cle: Cle,
    enveloppe: Enveloppe,
    annee: string,
    vehicule: VehiculeCanonique,
    nb: number,
  ): void {
    if (nb <= 0) return;
    trajets.push({
      role: this.#entry.role,
      source: this.#entry.label,
      finess_juridique: cle.finess_juridique,
      finess_geographique: "",
      ght_libelle: cle.ght_libelle,
      enveloppe,
      annee,
      vehicule_canonique: vehicule,
      nb_trajets: nb,
    });
  }
}

// ---- implémentation ----

const PREMIERE_LIGNE_DONNEES = 3; // lignes 0-2 = en-têtes
const COLONNE_LIBELLE = 0; // colonne A
const LIBELLE_LIGNE_TOTAL = "total"; // ligne récapitulative à ignorer (insensible à la casse)
const PREFIXE_FILLE = /^-\s/; // le libellé est déjà trimé par Xlsx.str
const FINESS_EN_FIN = /\((\d{9})\)$/;

const ANNEES = ["2023", "2024"] as const;

// Article 80 : total (sans détail véhicule), une colonne par année.
const COLONNES_ART80_TOTAL: Record<string, string> = {
  "2023": "B",
  "2024": "C",
};

// Hors Article 80 : détail par véhicule canonique, une colonne par année.
const COLONNES_HORS_ART80: {
  vehicule: VehiculeCanonique;
  colonnes: Record<string, string>;
}[] = [
  { vehicule: "Assis", colonnes: { "2023": "P", "2024": "Q" } }, // Taxi
  { vehicule: "Assis", colonnes: { "2023": "R", "2024": "S" } }, // VSL
  { vehicule: "Ambulance", colonnes: { "2023": "T", "2024": "U" } },
  { vehicule: "Autre", colonnes: { "2023": "V", "2024": "W" } }, // TPMR
];

interface Fille {
  r: number;
  finess: string;
}

interface Groupe {
  r: number;
  libelle: string;
  filles: Fille[];
}

/** Ce qui identifie une ligne émise : un finess (fille) ou un libellé libre (parent). */
interface Cle {
  finess_juridique: string;
  ght_libelle: string;
}

type XlsxSheet = ReturnType<typeof Xlsx.sheet>;
