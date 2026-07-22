// Utilitaires CSV — lecture des sources et lecture/écriture des artefacts ETL.
//
// Deux formats coexistent :
//  - certains CSV *sources* sont en UTF-16LE, séparés par des tabulations, sans
//    échappement ;
//  - les CSV *artefacts* (build/, ref/) que l'on produit sont en UTF-8, séparés par
//    des virgules, avec échappement RFC 4180 (indispensable : des libellés de GHT
//    contiennent des virgules).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export class Csv {
  /** Lit un CSV source UTF-16LE tabulé et renvoie les lignes de données (en-tête exclu). */
  static readUtf16Tsv(path: string): string[][] {
    const text = Csv.#stripBom(readFileSync(path).toString("utf16le"));
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    return lines.slice(1).map((l) => l.split("\t").map((c) => c.trim()));
  }

  /** Écrit un tableau d'objets en CSV UTF-8 (virgule, RFC 4180). Crée le dossier au besoin. */
  static write(path: string, rows: Record<string, string | number>[]): void {
    mkdirSync(dirname(path), { recursive: true });
    if (rows.length === 0) return writeFileSync(path, "");
    writeFileSync(path, Csv.#serialize(Object.keys(rows[0]!), rows));
  }

  /** Lit un CSV UTF-8 (virgule, RFC 4180) produit par `write`, en tableau d'objets. */
  static read(path: string): Record<string, string>[] {
    const text = readFileSync(path, "utf8").replace(/\n$/, "");
    if (text.length === 0) return [];
    const [header, ...body] = new CsvParser(text).execute();
    return header ? body.map((fields) => Csv.#toObject(header, fields)) : [];
  }

  static #serialize(columns: string[], rows: Record<string, string | number>[]): string {
    const header = columns.map(Csv.#encode).join(",");
    const body = rows.map((row) => columns.map((c) => Csv.#encode(String(row[c] ?? ""))).join(","));
    return [header, ...body].join("\n") + "\n";
  }

  static #toObject(header: string[], fields: string[]): Record<string, string> {
    const obj: Record<string, string> = {};
    header.forEach((col, i) => (obj[col] = fields[i] ?? ""));
    return obj;
  }

  static #encode(value: string): string {
    return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  }

  static #stripBom(text: string): string {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  }
}

/** Parseur CSV RFC 4180 (guillemets, virgules et retours ligne échappés), en machine à états. */
class CsvParser {
  readonly #text: string;
  readonly #records: string[][] = [];
  #record: string[] = [];
  #field = "";
  #inQuotes = false;
  #i = 0;

  constructor(text: string) {
    this.#text = text;
  }

  execute(): string[][] {
    while (this.#i < this.#text.length) this.#step();
    this.#endField();
    this.#records.push(this.#record);
    return this.#records;
  }

  #step(): void {
    const ch = this.#text[this.#i++]!;
    if (this.#inQuotes) this.#stepInQuotes(ch);
    else this.#stepOutQuotes(ch);
  }

  #stepInQuotes(ch: string): void {
    if (ch !== '"') this.#field += ch;
    else if (this.#text[this.#i] === '"') this.#i++, (this.#field += '"');
    else this.#inQuotes = false;
  }

  #stepOutQuotes(ch: string): void {
    if (ch === '"') this.#inQuotes = true;
    else if (ch === ",") this.#endField();
    else if (ch === "\n" || ch === "\r") this.#endLine(ch);
    else this.#field += ch;
  }

  #endLine(ch: string): void {
    if (ch === "\r" && this.#text[this.#i] === "\n") this.#i++;
    this.#endField();
    this.#records.push(this.#record);
    this.#record = [];
  }

  #endField(): void {
    this.#record.push(this.#field);
    this.#field = "";
  }
}
