// Construction du contexte inter-app transmis au simulateur via le fragment
// d'URL (#ctx=). Voir docs/architecture/identification.md — ADR-4 & §4.
//
// Le prescripteur (et l'établissement / service) sont transmis sous forme de
// **pseudonymes à sens unique** — `HMAC-SHA256(id, secret)` tronqué — jamais
// l'identifiant brut, jamais le nom. Le secret reste **côté serveur** : c'est ce
// qui rend le jeton non réversible et non forgeable sans le secret. Le simulateur
// ne fait que forwarder ces refs à Matomo (cf. analytics.md — ADR-2).

import { createHmac } from "node:crypto";
import type { Selection } from "../src/selection.ts";

/** Version du format `ctx`. v2 : identifiants opaques → refs pseudonymisées. */
export const CTX_VERSION = 2 as const;

export type Contexte = {
  etabRef: string;
  serviceRef: string;
  prescripteurRef: string;
  v: typeof CTX_VERSION;
};

/** Pseudonyme stable, non réversible sans le secret (128 bits, base64url). */
export function pseudonymise(secret: string, value: string): string {
  return createHmac("sha256", secret)
    .update(value)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

export function buildContexte(secret: string, sel: Selection): Contexte {
  return {
    etabRef: pseudonymise(secret, sel.etabId),
    serviceRef: pseudonymise(secret, sel.serviceId),
    prescripteurRef: pseudonymise(secret, sel.prescripteurId),
    v: CTX_VERSION,
  };
}

/** Encode le contexte en base64url d'un JSON (décodé par le simulateur). */
export function encodeContexte(ctx: Contexte): string {
  return Buffer.from(JSON.stringify(ctx), "utf8").toString("base64url");
}

export function buildEncodedContexte(secret: string, sel: Selection): string {
  return encodeContexte(buildContexte(secret, sel));
}
