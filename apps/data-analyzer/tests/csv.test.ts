// Tests des helpers CSV (sans mock) : round-trip RFC 4180 et lecture UTF-16 tabulé.

import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readCsv, writeCsv, readUtf16Tsv } from "../src/csv.ts";

const dirs: string[] = [];
function tmp(): string {
  const d = mkdtempSync(join(tmpdir(), "data-analyzer-"));
  dirs.push(d);
  return d;
}
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop()!, { recursive: true, force: true });
});

describe("writeCsv / readCsv", () => {
  it("round-trip des valeurs avec virgules, guillemets et retours ligne", () => {
    const path = join(tmp(), "out.csv");
    const rows = [
      { ght: "GHT13 (Aix, Salon, Martigues)", nb: 18456, note: 'dit "démarrage"' },
      { ght: "Ligne\navec saut", nb: 0, note: "" },
    ];
    writeCsv(path, rows);
    const back = readCsv(path);
    expect(back).toEqual([
      { ght: "GHT13 (Aix, Salon, Martigues)", nb: "18456", note: 'dit "démarrage"' },
      { ght: "Ligne\navec saut", nb: "0", note: "" },
    ]);
  });

  it("écrit un fichier vide pour un tableau vide", () => {
    const path = join(tmp(), "empty.csv");
    writeCsv(path, []);
    expect(readCsv(path)).toEqual([]);
  });
});

describe("readUtf16Tsv", () => {
  it("décode l'UTF-16LE (BOM), sépare par tabulation et exclut l'en-tête", () => {
    const path = join(tmp(), "src.csv");
    const content = "Finess\tAnnée\tNb\n780110078\t2024\t114\n\t2024\t99\n";
    writeFileSync(path, "﻿" + content, "utf16le");
    expect(readUtf16Tsv(path)).toEqual([
      ["780110078", "2024", "114"],
      ["", "2024", "99"],
    ]);
  });
});
