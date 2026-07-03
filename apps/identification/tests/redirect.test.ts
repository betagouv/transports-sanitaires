import { describe, expect, it, vi } from "vitest";
import { CTX_VERSION, type Ctx } from "../src/ctx";
import { goToSimulateur, simulateurUrl } from "../src/redirect";

const ctx: Ctx = {
  etabId: "e_chu_grenoble",
  serviceId: "s_grenoble_cardio",
  prescripteurId: "p_grenoble_cardio_1",
  v: CTX_VERSION,
};

describe("simulateurUrl", () => {
  it("place le contexte dans le fragment", () => {
    const url = simulateurUrl(ctx, "https://simulateur.example");
    expect(url).toMatch(/^https:\/\/simulateur\.example#ctx=[A-Za-z0-9_-]+$/);
  });
});

describe("goToSimulateur", () => {
  it("navigue en top-level vers le simulateur", () => {
    const assign = vi.fn();
    const target = {
      location: { assign: vi.fn() },
      top: { location: { assign } },
    } as unknown as Window;

    goToSimulateur(ctx, target);

    expect(assign).toHaveBeenCalledWith(simulateurUrl(ctx));
  });

  it("retombe sur la fenêtre courante si l'accès à top lève (iframe cross-origin)", () => {
    const assign = vi.fn();
    const target = {
      location: { assign },
      get top(): Window {
        throw new Error("cross-origin");
      },
    } as unknown as Window;

    goToSimulateur(ctx, target);

    expect(assign).toHaveBeenCalledWith(simulateurUrl(ctx));
  });
});
