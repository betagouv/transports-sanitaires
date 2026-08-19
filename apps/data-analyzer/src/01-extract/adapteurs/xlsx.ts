// Accès bas niveau à une feuille xlsx (SheetJS), partagé par les adaptateurs xlsx.

import XLSX from "xlsx";

export class Xlsx {
  /** Première feuille d'un classeur. */
  static sheet(path: string): XLSX.WorkSheet {
    const wb = XLSX.readFile(path);
    return wb.Sheets[wb.SheetNames[0]!]!;
  }

  /** Plage utilisée de la feuille : { s: {c,r}, e: {c,r} } (0-indexés). */
  static range(ws: XLSX.WorkSheet): XLSX.Range {
    return XLSX.utils.decode_range(ws["!ref"]!);
  }

  /** Index de colonne 0-indexé depuis une lettre (« A » → 0, « W » → 22). */
  static col(letter: string): number {
    return XLSX.utils.decode_col(letter);
  }

  /** Valeur texte d'une cellule (r, c 0-indexés), vide si absente. */
  static str(ws: XLSX.WorkSheet, r: number, c: number): string {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    return cell == null ? "" : String(cell.v).trim();
  }

  /** Valeur numérique d'une cellule, 0 si absente/vide. */
  static num(ws: XLSX.WorkSheet, r: number, c: number): number {
    const cell = ws[XLSX.utils.encode_cell({ r, c })];
    if (cell == null || cell.v === "") return 0;
    return Xlsx.#toNumber(cell.v);
  }

  static #toNumber(v: unknown): number {
    const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
}
