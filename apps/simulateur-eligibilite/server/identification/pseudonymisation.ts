// Pseudonymisation de l'identité saisie (refs prescripteur) renvoyée au front par
// l'API `POST /api/identite-pseudonymisee`. Voir docs/architecture/identification.md — ADR-4.
//
// Le prescripteur (et l'établissement / service) sont transmis sous forme de
// **pseudonymes à sens unique** — `HMAC-SHA256(id, secret)` tronqué — jamais
// l'identifiant brut, jamais le nom. Le secret reste **côté serveur** : c'est ce
// qui rend le jeton non réversible et non forgeable sans le secret. Le front garde
// ces refs en mémoire de session et les forwarde à Matomo (cf. analytics.md).
//
// Mode debug (`enClair`, piloté par `PSEUDONYMISATION_EN_CLAIR` — phase de test
// **uniquement**) : on renvoie la valeur préfixée en clair au lieu du HMAC, pour
// lire directement les refs dans Matomo. ⚠️ Révèle des données brutes (dont
// nom/prénom normalisés) : à ne **jamais** activer en production.

import { createHmac } from "node:crypto";
import {
  VERSION,
  type IdentitePseudonymisee,
} from "../../shared/identite-pseudonymisee.ts";
import {
  normalise,
  PRESCRIPTEUR_HORS_LISTE,
  type IdentiteSaisie,
} from "../../shared/identite-saisie.ts";

/**
 * Pseudonymise l'identité saisie selon la branche d'identification. Les valeurs
 * sont préfixées par leur nature (`etab:`, `service:`, …) pour éviter toute
 * collision entre un id de référentiel et un texte libre. Certaines refs sont
 * absentes selon la branche (identité pseudonymisée à refs optionnelles).
 */
export function pseudonymiser(
  secret: string,
  saisie: IdentiteSaisie,
  enClair = false
): IdentitePseudonymisee {
  const identite: IdentitePseudonymisee = { v: VERSION };

  // Établissement.
  if (saisie.etabId) {
    identite.etabRef = empreinte(secret, `etab:${saisie.etabId}`, enClair);
  }

  // Service.
  if (saisie.serviceId) {
    identite.serviceRef = empreinte(secret, `service:${saisie.serviceId}`, enClair);
  }

  // Prescripteur (réel, ou identité libre si hors liste).
  if (saisie.prescripteurId && saisie.prescripteurId !== PRESCRIPTEUR_HORS_LISTE) {
    identite.prescripteurRef = empreinte(
      secret,
      `prescripteur:${saisie.prescripteurId}`,
      enClair
    );
  } else if (saisie.nom && saisie.prenom) {
    identite.prescripteurRef = refIdentite(secret, saisie.nom, saisie.prenom, enClair);
  }

  return identite;
}

/**
 * Empreinte stable, non réversible sans le secret (128 bits, base64url). En mode
 * debug (`enClair`, cf. en-tête du module) renvoie la valeur préfixée en clair
 * pour faciliter la lecture dans Matomo en phase de test — jamais en production.
 */
export function empreinte(secret: string, value: string, enClair = false): string {
  if (enClair) return value;
  return createHmac("sha256", secret)
    .update(value)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

// Ref d'identité à partir d'un nom/prénom libres. HMAC du texte normalisé —
// jamais le nom en clair (invariant PII, ADR-4 / R-6), sauf mode debug `enClair`.
const refIdentite = (
  secret: string,
  nom: string,
  prenom: string,
  enClair = false
): string =>
  empreinte(secret, `identite:${normalise(nom)}|${normalise(prenom)}`, enClair);
