// Test de la normalisation d'un finess : le zéro de tête perdu par une source se rétablit,
// et rien d'autre ne bouge.

import { describe, expect, it } from "vitest";
import { normaliserFiness } from "../src/finess.ts";

describe("normaliserFiness", () => {
  it("rétablit le zéro de tête d'un code tronqué", () => {
    expect(normaliserFiness("10000222")).toBe("010000222");
    expect(normaliserFiness("70000120")).toBe("070000120");
  });

  it("laisse un code déjà complet intact", () => {
    expect(normaliserFiness("330000670")).toBe("330000670");
  });

  it("laisse les sentinelles de finess non renseigné intactes", () => {
    expect(normaliserFiness("")).toBe("");
    expect(normaliserFiness("0")).toBe("0");
  });

  it("laisse intact ce qui n'est pas un code de chiffres", () => {
    expect(normaliserFiness("AP-HP")).toBe("AP-HP");
  });
});
