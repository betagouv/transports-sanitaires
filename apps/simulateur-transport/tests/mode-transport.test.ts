import { describe, it, expect } from "vitest";
import { makeEngine } from "./engine";

// Situation de base garantissant l'éligibilité (hospitalisation)
const eligible_base = { "situation . hospitalisation ou séance": "oui" };

function mode(autonomie: Record<string, unknown>) {
  return makeEngine({ ...eligible_base, ...autonomie })
    .evaluate("mode de transport")
    .nodeValue;
}

describe("mode de transport", () => {
  it("non applicable si non éligible", () => {
    const result = makeEngine({}).evaluate("mode de transport");
    expect(result.nodeValue).toBeNull();
  });

  it("position allongée → ambulance", () => {
    expect(
      mode({ "autonomie . position allongée, surveillance ou conditions stériles": "oui" })
    ).toBe("ambulance");
  });

  it("position allongée prime sur aide technique → ambulance", () => {
    expect(
      mode({
        "autonomie . position allongée, surveillance ou conditions stériles": "oui",
        "autonomie . aide technique ou tierce personne": "oui",
      })
    ).toBe("ambulance");
  });

  it("aide technique → TAP (taxi/VSL)", () => {
    expect(
      mode({
        "autonomie . position allongée, surveillance ou conditions stériles": "non",
        "autonomie . aide technique ou tierce personne": "oui",
      })
    ).toBe("TAP (taxi/VSL)");
  });

  it("risque d'effets secondaires → TAP (taxi/VSL)", () => {
    expect(
      mode({
        "autonomie . position allongée, surveillance ou conditions stériles": "non",
        "autonomie . risque d'effets secondaires pendant le trajet": "oui",
      })
    ).toBe("TAP (taxi/VSL)");
  });

  it("aide technique + effets secondaires → TAP (taxi/VSL)", () => {
    expect(
      mode({
        "autonomie . position allongée, surveillance ou conditions stériles": "non",
        "autonomie . aide technique ou tierce personne": "oui",
        "autonomie . risque d'effets secondaires pendant le trajet": "oui",
      })
    ).toBe("TAP (taxi/VSL)");
  });

  it("patient autonome sans contrainte → véhicule personnel / transports en commun", () => {
    expect(
      mode({
        "autonomie . position allongée, surveillance ou conditions stériles": "non",
        "autonomie . aide technique ou tierce personne": "non",
        "autonomie . risque d'effets secondaires pendant le trajet": "non",
      })
    ).toBe("véhicule personnel / transports en commun");
  });
});
