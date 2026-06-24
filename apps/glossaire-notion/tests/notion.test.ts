import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parseGlossaryEntries } from "../src/notion";
import type { ExtendedRecordMap } from "notion-types";

const fixturePath = path.resolve(process.cwd(), "tests/fixtures/glossaire-recordmap.json");
const recordMap = JSON.parse(readFileSync(fixturePath, "utf-8")) as ExtendedRecordMap;

describe("parseGlossaryEntries", () => {
  it("extracts every glossary row from the recordMap", () => {
    const entries = parseGlossaryEntries(recordMap);
    expect(entries.length).toBeGreaterThan(0);
  });

  it("maps the schema columns to the right fields", () => {
    const entries = parseGlossaryEntries(recordMap);
    const ald = entries.find((entry) => entry.terme === "ALD");

    expect(ald).toMatchObject({
      terme: "ALD",
      categorie: "Réglementation",
      statut: "Validated",
      source: "Guide AM",
    });
    expect(ald?.definition).toContain("Affection de Longue Durée");
  });

  it("sorts entries alphabetically by terme", () => {
    const entries = parseGlossaryEntries(recordMap);
    const termes = entries.map((entry) => entry.terme);
    const sorted = [...termes].sort((a, b) => a.localeCompare(b, "fr"));
    expect(termes).toEqual(sorted);
  });

  it("omits optional fields that are empty rather than returning empty strings", () => {
    const entries = parseGlossaryEntries(recordMap);
    const amblea = entries.find((entry) => entry.terme === "Amblea");

    expect(amblea?.source).toBeUndefined();
  });

  it("returns an empty array when there is no collection in the recordMap", () => {
    const entries = parseGlossaryEntries({ block: {}, collection: {}, collection_view: {}, notion_user: {}, collection_query: {} } as ExtendedRecordMap);
    expect(entries).toEqual([]);
  });
});
