// Contrat partagé entre le front et le back pour l'identité pseudonymisée du
// prescripteur. C'est la source unique de sa forme et de sa version : le backend la
// produit, le front la valide et la consomme. Voir l'ADR-4 de
// docs/architecture/identification.md.

export const VERSION = 2 as const;

// Les `*Ref` sont des pseudonymes HMAC calculés côté serveur. Ils ne sont pas
// réversibles sans le secret, et ne portent jamais l'identifiant brut, le nom ni le
// RPPS. Le front ne fait que les forwarder à Matomo, voir analytics.md.
//
// Elles sont optionnelles, parce que selon la branche d'identification certaines
// n'existent pas : « autre service » n'a pas de prescripteur, « non rattaché » n'a
// pas de service. L'analytics n'utilise que `prescripteurRef`, et son absence donne
// un événement sans Nom, voir `front/analytics/matomo.ts`.
export type IdentitePseudonymisee = {
  etabRef?: string;
  serviceRef?: string;
  prescripteurRef?: string;
  v: typeof VERSION;
};

/** Valide la forme d'une identité pseudonymisée reçue de `POST /api/identite-pseudonymisee`. */
export function estIdentitePseudonymisee(
  valeur: unknown,
): valeur is IdentitePseudonymisee {
  if (typeof valeur !== "object" || valeur === null) return false;
  const candidat = valeur as Record<string, unknown>;
  const refOk = (ref: unknown) => ref === undefined || typeof ref === "string";
  return (
    candidat.v === VERSION &&
    refOk(candidat.etabRef) &&
    refOk(candidat.serviceRef) &&
    refOk(candidat.prescripteurRef)
  );
}
