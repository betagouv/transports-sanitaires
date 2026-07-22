// Format « plateforme au niveau GHT » (xlsx, en-têtes multi-niveaux, sans finess).
//
// Structure (publique) : colonne A = libellé GHT libre ; les colonnes de valeurs sont
// fixes (cf. constantes) ; les colonnes de montants sont ignorées. Les lignes 0 à 2 sont
// des en-têtes ; la ligne « Total » est ignorée.

import type { TrajetRow } from "../../contrats.ts";
import type { Adapter, VehiculeCanonique } from "../../types.ts";
import { col, num, range, sheet, str } from "./shared.ts";

const PREMIERE_LIGNE_DONNEES = 3; // lignes 0-2 = en-têtes
const COLONNE_LIBELLE_GHT = 0; // colonne A
const LIBELLE_LIGNE_TOTAL = "total"; // ligne récapitulative à ignorer (insensible à la casse)

// Millésimes couverts par ce format.
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

export const plateformeGhtXlsx: Adapter = (location, entry) => {
  const ws = sheet(location);
  const { e } = range(ws);

  const trajets: TrajetRow[] = [];
  const push = (
    ght: string,
    enveloppe: TrajetRow["enveloppe"],
    annee: string,
    vehicule: VehiculeCanonique,
    nb: number,
  ) => {
    if (nb > 0)
      trajets.push({
        role: entry.role,
        source: entry.label,
        finess_juridique: "",
        finess_geographique: "",
        ght_libelle: ght,
        enveloppe,
        annee,
        vehicule_canonique: vehicule,
        nb_trajets: nb,
      });
  };

  for (let r = PREMIERE_LIGNE_DONNEES; r <= e.r; r++) {
    const ght = str(ws, r, COLONNE_LIBELLE_GHT);
    if (!ght || ght.toLowerCase() === LIBELLE_LIGNE_TOTAL) continue;
    for (const annee of ANNEES) {
      push(ght, "Article 80", annee, "Total", num(ws, r, col(COLONNES_ART80_TOTAL[annee]!)));
      for (const { vehicule, colonnes } of COLONNES_HORS_ART80) {
        push(ght, "Hors Article 80", annee, vehicule, num(ws, r, col(colonnes[annee]!)));
      }
    }
  }
  return { trajets };
};
