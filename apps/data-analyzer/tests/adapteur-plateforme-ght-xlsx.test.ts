// Tests de l'adaptateur « plateforme au niveau GHT » (sans mock) : écrit un vrai .xlsx
// synthétique en temp et le fait lire par l'adaptateur, pour traverser SheetJS — c'est là
// que vivent les surprises du format (cellules vides, en-têtes multi-niveaux).
//
// Aucune donnée réelle : les libellés et les finess sont inventés.

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import XLSX from "xlsx";
import { AdapterPlateformeGhtXlsx } from "../src/01-extract/adapteurs/adapteur-plateforme-ght-xlsx.ts";
import type { MappingEntry } from "../src/types.ts";

const dirs: string[] = [];
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

// Une ligne du format : libellé, art. 80 par année, puis le détail véhicule (colonnes P à W).
// `vehicules` vaut [taxi23, taxi24, vsl23, vsl24, amb23, amb24, tpmr23, tpmr24].
function ligne(
  libelle: string,
  art80: [number | null, number | null],
  vehicules: (number | null)[] = [],
): unknown[] {
  const row: unknown[] = [libelle, ...art80];
  while (row.length < 15) row.push(null);
  for (let i = 0; i < 8; i++) row.push(vehicules[i] ?? null);
  return row;
}

const ENTETES = [["en-tête 1"], ["en-tête 2"], ["en-tête 3"]];

function extraire(lignes: unknown[][]) {
  const dir = mkdtempSync(join(tmpdir(), "data-analyzer-plateforme-ght-"));
  dirs.push(dir);
  const path = join(dir, "source.xlsx");
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([...ENTETES, ...lignes]),
    "Feuil1",
  );
  XLSX.writeFile(wb, path);
  const entry = { role: "plateforme", label: "source-1" } as MappingEntry;
  return new AdapterPlateformeGhtXlsx(path, entry).execute().trajets;
}

/** Les trajets d'une enveloppe et d'un véhicule, en [clé, année, nb]. */
function cellules(
  trajets: ReturnType<typeof extraire>,
  enveloppe: string,
  vehicule: string,
) {
  return trajets
    .filter(
      (t) => t.enveloppe === enveloppe && t.vehicule_canonique === vehicule,
    )
    .map((t) => [t.finess_juridique || t.ght_libelle, t.annee, t.nb_trajets]);
}

describe("AdapterPlateformeGhtXlsx", () => {
  it("sort une fille sur son finess juridique, sans libellé de GHT", () => {
    const trajets = extraire([
      ligne("GHT Alpha", [100, 110]),
      ligne("- Site A (010000011)", [40, 44], [null, null, 1, 2, 3, 4]),
    ]);
    const ambulances = trajets.filter(
      (t) => t.vehicule_canonique === "Ambulance",
    );
    expect(ambulances).toHaveLength(2);
    expect(ambulances[0]).toMatchObject({
      finess_juridique: "010000011",
      finess_geographique: "",
      ght_libelle: "",
      annee: "2023",
      nb_trajets: 3,
    });
  });

  it("ignore un parent qui a des filles, pour ne pas compter deux fois", () => {
    const trajets = extraire([
      ligne("GHT Alpha", [100, 110]),
      ligne("- Site A (010000011)", [40, 44], [null, null, null, null, 1, 1]),
      ligne("- Site B (020000022)", [55, 60], [null, null, null, null, 2, 2]),
    ]);
    expect(cellules(trajets, "Article 80", "Total")).toEqual([
      ["010000011", "2023", 40],
      ["010000011", "2024", 44],
      ["020000022", "2023", 55],
      ["020000022", "2024", 60],
    ]);
  });

  it("sort un parent sans filles sur son libellé libre", () => {
    const trajets = extraire([
      ligne("Établissement isolé", [70, 80], [null, null, null, null, 5, 6]),
    ]);
    expect(cellules(trajets, "Article 80", "Total")).toEqual([
      ["Établissement isolé", "2023", 70],
      ["Établissement isolé", "2024", 80],
    ]);
    expect(trajets.every((t) => t.finess_juridique === "")).toBe(true);
  });

  it("lit les filles d'un parent vide", () => {
    const trajets = extraire([
      ligne("GHT Beta", [null, null]),
      ligne("- Site C (030000033)", [12, 13], [null, null, null, null, 7, 8]),
    ]);
    expect(cellules(trajets, "Article 80", "Total")).toEqual([
      ["030000033", "2023", 12],
      ["030000033", "2024", 13],
    ]);
  });

  it("garde le détail véhicule du parent quand aucune fille n'en porte", () => {
    const trajets = extraire([
      ligne("GHT Gamma", [90, 95], [null, null, null, null, 400, 500]),
      ligne("- Site D (040000044)", [30, 35]),
      ligne("- Site E (050000055)", [60, 60]),
    ]);
    // L'article 80 vient des filles, le détail véhicule du parent : aucun double compte.
    expect(cellules(trajets, "Article 80", "Total")).toEqual([
      ["040000044", "2023", 30],
      ["040000044", "2024", 35],
      ["050000055", "2023", 60],
      ["050000055", "2024", 60],
    ]);
    expect(cellules(trajets, "Hors Article 80", "Ambulance")).toEqual([
      ["GHT Gamma", "2023", 400],
      ["GHT Gamma", "2024", 500],
    ]);
  });

  it("ignore la ligne de total et les lignes vides", () => {
    const trajets = extraire([
      ligne("GHT Delta", [10, 20], [null, null, null, null, 1, 1]),
      ligne("", [999, 999]),
      ligne("Total", [999, 999]),
    ]);
    expect(trajets.every((t) => t.nb_trajets !== 999)).toBe(true);
  });
});
