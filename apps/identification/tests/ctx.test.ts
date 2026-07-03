import { describe, expect, it } from "vitest";
import { CTX_VERSION, encodeCtx, type Ctx } from "../src/ctx";

function decodeBase64Url(payload: string): unknown {
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

const ctx: Ctx = {
  etabId: "e_chu_grenoble",
  serviceId: "s_grenoble_cardio",
  prescripteurId: "p_grenoble_cardio_1",
  v: CTX_VERSION,
};

describe("encodeCtx", () => {
  it("produit un payload base64url (sans +, / ni =)", () => {
    const payload = encodeCtx(ctx);
    expect(payload).not.toMatch(/[+/=]/);
  });

  it("encode le contexte de façon réversible", () => {
    expect(decodeBase64Url(encodeCtx(ctx))).toEqual(ctx);
  });

  it("ne transporte que des identifiants opaques", () => {
    const decoded = decodeBase64Url(encodeCtx(ctx)) as Record<string, unknown>;
    expect(Object.keys(decoded).sort()).toEqual([
      "etabId",
      "prescripteurId",
      "serviceId",
      "v",
    ]);
  });
});
