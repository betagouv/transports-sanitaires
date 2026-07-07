import { describe, expect, it, vi } from "vitest";
import { navigate, simulateurUrl } from "../src/redirect";

describe("simulateurUrl", () => {
  it("place le contexte encodé dans le fragment", () => {
    const url = simulateurUrl("abc123", "https://simulateur.example");
    expect(url).toBe("https://simulateur.example#ctx=abc123");
  });
});

describe("navigate", () => {
  it("navigue en top-level", () => {
    const assign = vi.fn();
    const target = {
      location: { assign: vi.fn() },
      top: { location: { assign } },
    } as unknown as Window;

    navigate("https://simulateur.example#ctx=x", target);

    expect(assign).toHaveBeenCalledWith("https://simulateur.example#ctx=x");
  });

  it("retombe sur la fenêtre courante si l'accès à top lève (iframe cross-origin)", () => {
    const assign = vi.fn();
    const target = {
      location: { assign },
      get top(): Window {
        throw new Error("cross-origin");
      },
    } as unknown as Window;

    navigate("https://simulateur.example#ctx=x", target);

    expect(assign).toHaveBeenCalledWith("https://simulateur.example#ctx=x");
  });
});
