import { describe, it, expect } from "vitest";
import { makeEngine } from "./engine";

function eligible(situation: Record<string, unknown>) {
  return makeEngine(situation).evaluate("éligible").nodeValue;
}

describe("éligibilité", () => {
  it("aucune condition remplie → non éligible", () => {
    expect(eligible({})).toBe(false);
  });

  describe("hospitalisation ou séance", () => {
    it("hospitalisation → éligible", () => {
      expect(eligible({ "situation . hospitalisation ou séance": "oui" })).toBe(true);
    });
  });

  describe("accident du travail", () => {
    it("accident du travail reconnu → éligible", () => {
      expect(eligible({ "situation . accident du travail": "oui" })).toBe(true);
    });
  });

  describe("ALD", () => {
    const ald_complete = {
      "situation . ALD . reconnue": "oui",
      "situation . ALD . lien avec le transport": "oui",
      "situation . ALD . déficience ou incapacité": "oui",
    };

    it("ALD reconnue + lien transport + déficience → éligible", () => {
      expect(eligible(ald_complete)).toBe(true);
    });

    it("ALD reconnue mais sans lien avec le transport → non éligible", () => {
      expect(
        eligible({
          "situation . ALD . reconnue": "oui",
          "situation . ALD . lien avec le transport": "non",
          "situation . ALD . déficience ou incapacité": "oui",
        })
      ).toBe(false);
    });

    it("ALD reconnue + lien transport mais sans déficience → non éligible", () => {
      expect(
        eligible({
          "situation . ALD . reconnue": "oui",
          "situation . ALD . lien avec le transport": "oui",
          "situation . ALD . déficience ou incapacité": "non",
        })
      ).toBe(false);
    });

    it("ALD non reconnue → non éligible (même avec lien et déficience déclarés)", () => {
      expect(
        eligible({
          "situation . ALD . reconnue": "non",
          "situation . ALD . lien avec le transport": "oui",
          "situation . ALD . déficience ou incapacité": "oui",
        })
      ).toBe(false);
    });
  });

  describe("longue distance", () => {
    it("distance > 150 km → éligible", () => {
      expect(eligible({ "situation . distance aller": 151 })).toBe(true);
    });

    it("distance exactement 150 km → non éligible", () => {
      expect(eligible({ "situation . distance aller": 150 })).toBe(false);
    });

    it("distance > 50 km et >= 4 trajets sur 2 mois → éligible", () => {
      expect(
        eligible({
          "situation . distance aller": 51,
          "situation . nombre de trajets sur 2 mois": 4,
        })
      ).toBe(true);
    });

    it("distance > 50 km mais seulement 3 trajets → non éligible", () => {
      expect(
        eligible({
          "situation . distance aller": 51,
          "situation . nombre de trajets sur 2 mois": 3,
        })
      ).toBe(false);
    });

    it("distance <= 50 km avec >= 4 trajets → non éligible", () => {
      expect(
        eligible({
          "situation . distance aller": 50,
          "situation . nombre de trajets sur 2 mois": 4,
        })
      ).toBe(false);
    });
  });
});
