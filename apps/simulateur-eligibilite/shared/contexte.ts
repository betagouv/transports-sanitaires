// Contrat **partagé front ⇄ back** du contexte d'identification : refs
// pseudonymisées du prescripteur (et de son établissement / service). Source
// **unique** de la forme et de la version — le backend (pseudonymisation) la
// produit, le front la valide et la consomme. Voir
// docs/architecture/identification.md — ADR-4.
//
// Les valeurs (`*Ref`) sont des **pseudonymes HMAC** calculés côté serveur —
// **non réversibles** sans le secret, jamais l'identifiant brut, le nom ou le
// RPPS. Le front ne fait que les forwarder à Matomo (cf. analytics.md).

export const CONTEXTE_VERSION = 2 as const;

export type Contexte = {
  etabRef: string;
  serviceRef: string;
  prescripteurRef: string;
  v: typeof CONTEXTE_VERSION;
};

/** Valide la forme d'un contexte reçu de l'API (`POST /api/contexte`). */
export function isContexte(value: unknown): value is Contexte {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    c.v === CONTEXTE_VERSION &&
    typeof c.etabRef === "string" &&
    typeof c.serviceRef === "string" &&
    typeof c.prescripteurRef === "string"
  );
}
