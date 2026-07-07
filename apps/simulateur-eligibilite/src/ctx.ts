// Contexte d'identification reçu de l'app d'identification via le fragment d'URL
// (#ctx=). Voir docs/architecture/identification.md — ADR-4 & §4.
//
// Deux niveaux à ne pas confondre :
//   - l'**enveloppe** est un base64url d'un JSON — simple encodage de transport
//     (pour loger un objet dans un fragment d'URL), **réversible par
//     construction** : `fromBase64Url` + `JSON.parse` la décodent, c'est
//     nécessaire pour lire les refs ;
//   - les **valeurs** (`*Ref`) sont des **pseudonymes HMAC** calculés côté serveur
//     d'identification — **non réversibles** sans le secret, jamais l'identifiant
//     brut, le nom ou le RPPS.
//
// Le simulateur décode l'enveloppe puis forwarde les refs **telles quelles** à
// Matomo (cf. analytics.md — ADR-2) ; il n'inverse jamais le HMAC. Le contexte
// n'est pas signé.

export const CTX_VERSION = 2 as const;

export type Ctx = {
  etabRef: string;
  serviceRef: string;
  prescripteurRef: string;
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
    typeof c.etabRef === "string" &&
    typeof c.serviceRef === "string" &&
    typeof c.prescripteurRef === "string"
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
