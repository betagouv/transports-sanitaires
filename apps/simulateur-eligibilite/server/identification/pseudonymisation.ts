// Transforme l'identité saisie en refs à sens unique, pour l'API
// `POST /api/identite-pseudonymisee`. Voir docs/architecture/identification.md — ADR-4.

import { createHmac } from "node:crypto";
import {
  type IdentitePseudonymisee,
  VERSION,
} from "../../shared/identite-pseudonymisee.ts";
import {
  type IdentiteSaisie,
  normalise,
  PRESCRIPTEUR_HORS_LISTE,
} from "../../shared/identite-saisie.ts";

/**
 * Pseudonymise l'identité saisie selon la branche d'identification. Prescripteur,
 * établissement et service partent en **pseudonymes à sens unique** — jamais
 * l'identifiant brut, jamais le nom ; le secret reste côté serveur, c'est lui qui
 * rend le jeton non réversible et non forgeable. Le front garde ces refs en
 * mémoire de session et les forwarde à Matomo (cf. analytics.md).
 *
 * Les valeurs sont préfixées par leur nature (`etab:`, `service:`, …) pour éviter
 * toute collision entre un id de référentiel et un texte libre. Certaines refs
 * sont absentes selon la branche (identité pseudonymisée à refs optionnelles).
 */
export function pseudonymiser(
  secret: string,
  saisie: IdentiteSaisie,
  enClair = false,
): IdentitePseudonymisee {
  const identite: IdentitePseudonymisee = { v: VERSION };

  // Établissement.
  if (saisie.etabId) {
    identite.etabRef = empreinte(secret, `etab:${saisie.etabId}`, enClair);
  }

  // Service.
  if (saisie.serviceId) {
    identite.serviceRef = empreinte(
      secret,
      `service:${saisie.serviceId}`,
      enClair,
    );
  }

  // Prescripteur (réel, ou identité libre si hors liste).
  if (
    saisie.prescripteurId &&
    saisie.prescripteurId !== PRESCRIPTEUR_HORS_LISTE
  ) {
    identite.prescripteurRef = empreinte(
      secret,
      `prescripteur:${saisie.prescripteurId}`,
      enClair,
    );
  } else if (saisie.nom && saisie.prenom) {
    identite.prescripteurRef = refIdentite(
      secret,
      saisie.nom,
      saisie.prenom,
      enClair,
    );
  }

  return identite;
}

/**
 * Empreinte stable, non réversible sans le secret (128 bits, base64url). Exportée
 * pour que les tests recalculent une ref attendue sans rejouer la branche entière.
 *
 * Mode debug (`enClair`, piloté par `PSEUDONYMISATION_EN_CLAIR` — phase de test
 * **uniquement**) : renvoie la valeur préfixée en clair au lieu du HMAC, pour lire
 * directement les refs dans Matomo. ⚠️ Révèle des données brutes (dont nom/prénom
 * normalisés) : à ne **jamais** activer en production.
 */
export function empreinte(
  secret: string,
  value: string,
  enClair = false,
): string {
  if (enClair) return value;
  return createHmac("sha256", secret)
    .update(value)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

// ---- implémentation ----

// Ref d'identité à partir d'un nom/prénom libres. HMAC du texte normalisé —
// jamais le nom en clair (invariant PII, ADR-4 / R-6), sauf mode debug `enClair`.
function refIdentite(
  secret: string,
  nom: string,
  prenom: string,
  enClair = false,
): string {
  return empreinte(
    secret,
    `identite:${normalise(nom)}|${normalise(prenom)}`,
    enClair,
  );
}
