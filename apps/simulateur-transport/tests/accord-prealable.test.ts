import { describe, it, expect } from "vitest";
import { makeEngine } from "./engine";

function accord(situation: Record<string, unknown>) {
  return makeEngine(situation).evaluate("accord préalable requis").nodeValue;
}

describe("accord préalable", () => {
  it("non applicable si non éligible", () => {
    expect(accord({})).toBeNull();
  });

  it("distance > 150 km → accord requis", () => {
    expect(accord({ "situation . distance aller": 151 })).toBe(true);
  });

  it("distance exactement 150 km → pas d'accord", () => {
    // 150 n'est ni > 150 ni éligible via distance seule
    expect(accord({ "situation . distance aller": 150 })).toBeNull();
  });

  it("distance > 50 km et >= 4 trajets → accord requis", () => {
    expect(
      accord({
        "situation . distance aller": 60,
        "situation . nombre de trajets sur 2 mois": 4,
      })
    ).toBe(true);
  });

  it("distance > 50 km mais seulement 3 trajets → pas d'accord", () => {
    // non éligible → non applicable
    expect(
      accord({
        "situation . distance aller": 60,
        "situation . nombre de trajets sur 2 mois": 3,
      })
    ).toBeNull();
  });

  it("hospitalisation sans longue distance → pas d'accord", () => {
    expect(
      accord({
        "situation . hospitalisation ou séance": "oui",
        "situation . distance aller": 30,
      })
    ).toBe(false);
  });

  it("ALD complète sans longue distance → pas d'accord", () => {
    expect(
      accord({
        "situation . ALD . reconnue": "oui",
        "situation . ALD . lien avec le transport": "oui",
        "situation . ALD . déficience ou incapacité": "oui",
        "situation . distance aller": 40,
      })
    ).toBe(false);
  });
});
