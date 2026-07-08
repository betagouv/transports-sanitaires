// Construction du contexte d'identification (refs prescripteur) renvoyé au front
// par l'API `POST /api/contexte`. Voir docs/architecture/identification.md — ADR-4.
//
// Le prescripteur (et l'établissement / service) sont transmis sous forme de
// **pseudonymes à sens unique** — `HMAC-SHA256(id, secret)` tronqué — jamais
// l'identifiant brut, jamais le nom. Le secret reste **côté serveur** : c'est ce
// qui rend le jeton non réversible et non forgeable sans le secret. Le front garde
// ces refs en mémoire de session et les forwarde à Matomo (cf. analytics.md).

import { createHmac } from "node:crypto";
import { CONTEXTE_VERSION, type Contexte } from "../../shared/contexte.ts";
import type { Selection } from "../../shared/selection.ts";

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
    v: CONTEXTE_VERSION,
  };
}
