import { describe, expect, it } from "vitest";
import { normalize, searchGlossary } from "../src/search";
import type { GlossaryEntry } from "../src/notion";

const entries: GlossaryEntry[] = [
  { id: "1", terme: "ALD", definition: "Affection de Longue Durée" },
  { id: "2", terme: "Ambulance", definition: "Transport adapté pour patient allongé" },
  { id: "3", terme: "ANS", definition: "Agence du Numérique en Santé" },
];

describe("normalize", () => {
  it("strips accents and lowercases", () => {
    expect(normalize("Définition éligibilité")).toBe("definition eligibilite");
  });
});

describe("searchGlossary", () => {
  it("returns every entry when the query is empty", () => {
    expect(searchGlossary(entries, "")).toEqual(entries);
  });

  it("matches on the terme, case and accent insensitively", () => {
    expect(searchGlossary(entries, "ambulance").map((e) => e.terme)).toEqual(["Ambulance"]);
    expect(searchGlossary(entries, "AMBULANCE").map((e) => e.terme)).toEqual(["Ambulance"]);
  });

  it("matches on the definition", () => {
    expect(searchGlossary(entries, "numerique").map((e) => e.terme)).toEqual(["ANS"]);
  });

  it("ignores accents in the query itself", () => {
    expect(searchGlossary(entries, "longue durée").map((e) => e.terme)).toEqual(["ALD"]);
  });

  it("returns no entries when nothing matches", () => {
    expect(searchGlossary(entries, "xyz")).toEqual([]);
  });
});
