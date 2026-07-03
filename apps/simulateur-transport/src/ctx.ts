// Contexte d'identification reçu de l'app d'identification via le fragment d'URL
// (#ctx=). Voir docs/architecture/identification.md — ADR-4 & §4.
// Identifiants opaques uniquement ; le contexte n'est pas signé.

export const CTX_VERSION = 1 as const;

export type Ctx = {
  etabId: string;
  serviceId: string;
  prescripteurId: string;
  v: typeof CTX_VERSION;
};

function fromBase64Url(payload: string): string {
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(b64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isCtx(value: unknown): value is Ctx {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    c.v === CTX_VERSION &&
    typeof c.etabId === "string" &&
    typeof c.serviceId === "string" &&
    typeof c.prescripteurId === "string"
  );
}

/** Extrait le contexte du fragment (`#ctx=…` ou `ctx=…`) ; `null` si absent/invalide. */
export function decodeCtx(hash: string): Ctx | null {
  const match = hash.replace(/^#/, "").match(/(?:^|&)ctx=([^&]+)/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(fromBase64Url(decodeURIComponent(match[1])));
    return isCtx(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
