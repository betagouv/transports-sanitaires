// Contexte inter-app transmis au simulateur via le fragment d'URL (#ctx=).
// Voir docs/architecture/identification.md — ADR-4 & §4.
// Identifiants opaques uniquement : jamais de nom, de RPPS ni de donnée patient.

export const CTX_VERSION = 1 as const;

/** Convention pour un prescripteur absent du référentiel (ADR §4). */
export const PRESCRIPTEUR_AUTRE = "p_autre";

export type Ctx = {
  etabId: string;
  serviceId: string;
  prescripteurId: string;
  v: typeof CTX_VERSION;
};

function toBase64Url(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function encodeCtx(ctx: Ctx): string {
  return toBase64Url(JSON.stringify(ctx));
}
