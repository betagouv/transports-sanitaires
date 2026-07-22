// Format « plateforme au niveau établissement » (CSV UTF-16 tabulé).
//
// Colonnes fixes (cf. constantes ci-dessous) ; les colonnes finess varient d'un fichier à
// l'autre → passées en options du mapping :
//   options: { colFinessJuridique: number, colFinessGeographique: number }

import { readUtf16Tsv } from "../../csv.ts";
import type { TrajetRow } from "../../contrats.ts";
import type { Adapter, VehiculeCanonique } from "../../types.ts";
import { colOption, toEnveloppe } from "./shared.ts";

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

export const plateformeFinessTsv: Adapter = (location, entry) => {
  const colJur = colOption(entry.options, "colFinessJuridique");
  const colGeo = colOption(entry.options, "colFinessGeographique");

  const trajets: TrajetRow[] = [];
  for (const r of readUtf16Tsv(location)) {
    if (r.length < NB_COLONNES_MIN) continue;
    const finessJur = r[colJur] ?? "";
    const finessGeo = r[colGeo] ?? "";
    if (!finessJur && !finessGeo) continue; // lignes d'agrégat sans finess
    const nb = Number(r[COL_NB_TRAJETS]);
    if (!Number.isFinite(nb) || nb <= 0) continue;
    const vehiculeSource = r[COL_VEHICULE] ?? "";
    const vehicule = VEHICULE[vehiculeSource];
    if (!vehicule)
      throw new Error(`Véhicule non mappé : ${JSON.stringify(vehiculeSource)} (${entry.label}).`);
    trajets.push({
      role: entry.role,
      source: entry.label,
      finess_juridique: finessJur,
      finess_geographique: finessGeo === FINESS_GEOGRAPHIQUE_ABSENT ? "" : finessGeo,
      ght_libelle: "",
      enveloppe: toEnveloppe(r[COL_ENVELOPPE] ?? ""),
      annee: r[COL_ANNEE] ?? "",
      vehicule_canonique: vehicule,
      nb_trajets: nb,
    });
  }
  return { trajets };
};
