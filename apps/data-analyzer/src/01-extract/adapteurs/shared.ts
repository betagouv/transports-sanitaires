// Helpers partagés par les adaptateurs de format.

import XLSX from "xlsx";
import type { Enveloppe } from "../../types.ts";

export type WS = XLSX.WorkSheet;

/** Première feuille d'un classeur xlsx. */
export function sheet(path: string): WS {
  const wb = XLSX.readFile(path);
  return wb.Sheets[wb.SheetNames[0]!]!;
}

/** Plage utilisée de la feuille : { s: {c,r}, e: {c,r} } (0-indexés). */
export function range(ws: WS): XLSX.Range {
  return XLSX.utils.decode_range(ws["!ref"]!);
}

/** Index de colonne 0-indexé depuis une lettre (« A » → 0, « W » → 22). */
export function col(letter: string): number {
  return XLSX.utils.decode_col(letter);
}

/** Valeur texte d'une cellule (r, c 0-indexés), vide si absente. */
export function str(ws: WS, r: number, c: number): string {
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  return cell == null ? "" : String(cell.v).trim();
}

/** Valeur numérique d'une cellule, 0 si absente/vide. */
export function num(ws: WS, r: number, c: number): number {
  const cell = ws[XLSX.utils.encode_cell({ r, c })];
  if (cell == null || cell.v === "") return 0;
  const n = typeof cell.v === "number" ? cell.v : Number(String(cell.v).replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function toEnveloppe(value: string): Enveloppe {
  if (value === "Article 80" || value === "Hors Article 80") return value;
  throw new Error(`Enveloppe inattendue : ${JSON.stringify(value)}`);
}

/** Lit un index de colonne (0-indexé) depuis les options du mapping. */
export function colOption(options: Record<string, unknown>, key: string): number {
  const v = options[key];
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0)
    throw new Error(`options.${key} attendu (index de colonne entier ≥ 0).`);
  return v;
}
