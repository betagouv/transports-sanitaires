// Transforme l'identité saisie en refs à sens unique, pour l'API
// `POST /api/identite-pseudonymisee`. Voir l'ADR-4 de
// docs/knowledge/adr/identification.md.

import { createHmac } from "node:crypto";
import {
  type IdentitePseudonymisee,
  VERSION,
} from "../../shared/identite-pseudonymisee.ts";
import type { IdentiteSaisie } from "../../shared/identite-saisie.ts";

/**
 * Pseudonymise l'établissement et le service saisis. Ils partent en pseudonymes à
 * sens unique, jamais en identifiant brut. Le secret reste côté serveur, et c'est
 * lui qui rend le jeton non réversible et non forgeable. Le front garde ces refs en
 * mémoire de session et les forwarde à Matomo, voir analytics.md.
 *
 * Les valeurs sont préfixées par leur nature, `etab:` et `service:`, pour éviter
 * toute collision entre deux identifiants de référentiel.
 */
export function pseudonymiser(
  secret: string,
  saisie: IdentiteSaisie,
  enClair = false,
): IdentitePseudonymisee {
  const identite: IdentitePseudonymisee = { v: VERSION };
  if (saisie.etabId) {
    identite.etabRef = empreinte(secret, `etab:${saisie.etabId}`, enClair);
  }
  if (saisie.serviceId) {
    identite.serviceRef = empreinte(
      secret,
      `service:${saisie.serviceId}`,
      enClair,
    );
  }
  return identite;
}

/**
 * Empreinte stable, non réversible sans le secret, sur 128 bits en base64url. Elle
 * est exportée pour que les tests recalculent une ref attendue sans rejouer la
 * branche entière.
 *
 * Le mode debug `enClair`, piloté par `PSEUDONYMISATION_EN_CLAIR` et réservé à la
 * phase de test, renvoie la valeur préfixée en clair au lieu du HMAC, pour lire
 * directement les refs dans Matomo. ⚠️ Il révèle les identifiants bruts du
 * référentiel : à ne jamais activer en production.
 */
export function empreinte(
  secret: string,
  valeur: string,
  enClair = false,
): string {
  if (enClair) return valeur;
  return createHmac("sha256", secret)
    .update(valeur)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}
