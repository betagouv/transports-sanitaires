// Contrat **partagé front ⇄ back** de l'identité pseudonymisée du prescripteur :
// refs pseudonymisées du prescripteur (et de son établissement / service). Source
// **unique** de la forme et de la version — le backend (pseudonymisation) la
// produit, le front la valide et la consomme. Voir
// docs/architecture/identification.md — ADR-4.
//
// Les valeurs (`*Ref`) sont des **pseudonymes HMAC** calculés côté serveur —
// **non réversibles** sans le secret, jamais l'identifiant brut, le nom ou le
// RPPS. Le front ne fait que les forwarder à Matomo (cf. analytics.md).

export const VERSION = 2 as const;

// Refs **optionnelles** : selon la branche d'identification, certaines n'existent
// pas (ex. « autre service » n'a pas de prescripteur ; « non rattaché » n'a pas de
// service). L'analytics n'utilise que `prescripteurRef` (absent → événement sans
// Nom, cf. analytics.ts).
export type IdentitePseudonymisee = {
  etabRef?: string;
  serviceRef?: string;
  prescripteurRef?: string;
  v: typeof VERSION;
};

/** Valide la forme d'une identité pseudonymisée reçue de l'API (`POST /api/identite-pseudonymisee`). */
export function estIdentitePseudonymisee(
  value: unknown
): value is IdentitePseudonymisee {
  if (typeof value !== "object" || value === null) return false;
  const candidat = value as Record<string, unknown>;
  const refOk = (ref: unknown) => ref === undefined || typeof ref === "string";
  return (
    candidat.v === VERSION &&
    refOk(candidat.etabRef) &&
    refOk(candidat.serviceRef) &&
    refOk(candidat.prescripteurRef)
  );
}
