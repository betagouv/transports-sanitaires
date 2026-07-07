import { describe, expect, it, vi } from "vitest";
import { CTX_VERSION, decodeCtx } from "../src/ctx";
import { initSession } from "../src/session";

// Encode comme le fait l'app d'identification (base64url d'un JSON).
function encodeCtx(json: object): string {
  const bytes = new TextEncoder().encode(JSON.stringify(json));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const ctx = {
  etabRef: "aWJEZXRhYlJlZg",
  serviceRef: "c2VydmljZVJlZg",
  prescripteurRef: "cHJlc2NyaXB0ZXVyUmVm",
  v: CTX_VERSION,
};

describe("decodeCtx", () => {
  it("décode un contexte valide", () => {
    expect(decodeCtx(`#ctx=${encodeCtx(ctx)}`)).toEqual(ctx);
  });

  it("renvoie null sans fragment ctx", () => {
    expect(decodeCtx("")).toBeNull();
    expect(decodeCtx("#autre=1")).toBeNull();
  });

  it("renvoie null pour un payload illisible", () => {
    expect(decodeCtx("#ctx=@@@")).toBeNull();
  });

  it("renvoie null pour un contexte de mauvaise forme", () => {
    expect(decodeCtx(`#ctx=${encodeCtx({ etabRef: "x", v: CTX_VERSION })}`)).toBeNull();
  });
});

describe("initSession", () => {
  it("lit le contexte et retire le fragment de l'URL", () => {
    const location = {
      hash: `#ctx=${encodeCtx(ctx)}`,
      pathname: "/simulateur",
      search: "",
    } as Location;
    const replaceState = vi.fn();
    const history = { replaceState } as unknown as History;

    expect(initSession(location, history)).toEqual(ctx);
    expect(replaceState).toHaveBeenCalledWith(null, "", "/simulateur");
  });

  it("ne touche pas l'URL en l'absence de contexte", () => {
    const location = { hash: "", pathname: "/simulateur", search: "" } as Location;
    const replaceState = vi.fn();
    const history = { replaceState } as unknown as History;

    initSession(location, history);
    expect(replaceState).not.toHaveBeenCalled();
  });
});
