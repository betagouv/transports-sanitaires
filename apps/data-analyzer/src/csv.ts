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

/** Lit un CSV source UTF-16LE tabulé et renvoie les lignes de données (en-tête exclu). */
export function readUtf16Tsv(path: string): string[][] {
  const buf = readFileSync(path);
  let text = buf.toString("utf16le");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM
  const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
  return lines.slice(1).map((l) => l.split("\t").map((c) => c.trim()));
}

function encodeField(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Écrit un tableau d'objets en CSV UTF-8 (virgule, RFC 4180). Crée le dossier au besoin. */
export function writeCsv(path: string, rows: Record<string, string | number>[]): void {
  mkdirSync(dirname(path), { recursive: true });
  if (rows.length === 0) {
    writeFileSync(path, "");
    return;
  }
  const columns = Object.keys(rows[0]!);
  const header = columns.map(encodeField).join(",");
  const body = rows.map((row) =>
    columns.map((c) => encodeField(String(row[c] ?? ""))).join(","),
  );
  writeFileSync(path, [header, ...body].join("\n") + "\n");
}

/** Lit un CSV UTF-8 (virgule, RFC 4180) produit par writeCsv, en tableau d'objets. */
export function readCsv(path: string): Record<string, string>[] {
  const text = readFileSync(path, "utf8").replace(/\n$/, "");
  if (text.length === 0) return [];
  const records = parseCsv(text);
  const [header, ...body] = records;
  if (!header) return [];
  return body.map((fields) => {
    const obj: Record<string, string> = {};
    header.forEach((col, i) => (obj[col] = fields[i] ?? ""));
    return obj;
  });
}

/** Parseur CSV RFC 4180 minimal (gère guillemets, virgules et retours ligne échappés). */
function parseCsv(text: string): string[][] {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      record.push(field);
      records.push(record);
      field = "";
      record = [];
    } else field += ch;
  }
  record.push(field);
  records.push(record);
  return records;
}
