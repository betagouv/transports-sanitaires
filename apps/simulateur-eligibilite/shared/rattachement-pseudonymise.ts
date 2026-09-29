// Contrat partagé entre le front et le back pour le rattachement pseudonymisé :
// l'établissement et le service, jamais la personne. C'est la source unique de sa
// forme et de sa version : le backend le produit, le front le valide et le
// consomme. Voir l'ADR-4 de docs/knowledge/adr/identification.md.

export const VERSION = 3 as const;

// Les `*Ref` sont des pseudonymes HMAC calculés côté serveur. Ils ne sont pas
// réversibles sans le secret, et ne portent jamais l'identifiant brut. Le front ne
// fait que les forwarder à Matomo, voir analytics.md.
//
// Elles sont optionnelles pour qu'une réponse partielle reste lisible.
// L'analytics n'utilise que `serviceRef`, et son absence donne un événement sans
// Nom, voir `front/analytics/matomo.ts`.
export type RattachementPseudonymise = {
  etabRef?: string;
  serviceRef?: string;
  v: typeof VERSION;
};

/** Valide la forme d'un rattachement pseudonymisé reçu de `POST /api/rattachement-pseudonymise`. */
export function estRattachementPseudonymise(
  valeur: unknown,
): valeur is RattachementPseudonymise {
  if (typeof valeur !== "object" || valeur === null) return false;
  const candidat = valeur as Record<string, unknown>;
  const refOk = (ref: unknown) => ref === undefined || typeof ref === "string";
  return (
    candidat.v === VERSION &&
    refOk(candidat.etabRef) &&
    refOk(candidat.serviceRef)
  );
}
