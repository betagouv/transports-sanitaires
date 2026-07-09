// Pseudonymisation de l'identité saisie (refs prescripteur) renvoyée au front par
// l'API `POST /api/identite-pseudonymisee`. Voir docs/architecture/identification.md — ADR-4.
//
// Le prescripteur (et l'établissement / service) sont transmis sous forme de
// **pseudonymes à sens unique** — `HMAC-SHA256(id, secret)` tronqué — jamais
// l'identifiant brut, jamais le nom. Le secret reste **côté serveur** : c'est ce
// qui rend le jeton non réversible et non forgeable sans le secret. Le front garde
// ces refs en mémoire de session et les forwarde à Matomo (cf. analytics.md).

import { createHmac } from "node:crypto";
import {
  VERSION,
  type IdentitePseudonymisee,
} from "../../shared/identite-pseudonymisee.ts";
import {
  ETAB_NON_RATTACHE,
  normalise,
  PRESCRIPTEUR_HORS_LISTE,
  SERVICE_AUTRE,
  type IdentiteSaisie,
} from "../../shared/identite-saisie.ts";

/** Empreinte stable, non réversible sans le secret (128 bits, base64url). */
export function empreinte(secret: string, value: string): string {
  return createHmac("sha256", secret)
    .update(value)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

// Ref d'identité à partir d'un nom/prénom libres. HMAC du texte normalisé —
// jamais le nom en clair (invariant PII, ADR-4 / R-6).
const refIdentite = (secret: string, nom: string, prenom: string): string =>
  empreinte(secret, `identite:${normalise(nom)}|${normalise(prenom)}`);

/**
 * Pseudonymise l'identité saisie selon la branche d'identification. Les valeurs
 * sont préfixées par leur nature (`etab:`, `categorie:`, `service:`, …) pour éviter
 * toute collision entre un id de référentiel et un texte libre. Certaines refs sont
 * absentes selon la branche (identité pseudonymisée à refs optionnelles).
 */
export function pseudonymiser(
  secret: string,
  saisie: IdentiteSaisie
): IdentitePseudonymisee {
  const identite: IdentitePseudonymisee = { v: VERSION };

  // Établissement (ou catégorie d'exercice si non rattaché).
  if (saisie.etabId === ETAB_NON_RATTACHE) {
    if (saisie.categorie)
      identite.etabRef = empreinte(secret, `categorie:${saisie.categorie}`);
  } else if (saisie.etabId) {
    identite.etabRef = empreinte(secret, `etab:${saisie.etabId}`);
  }

  // Service (réel ou libre).
  if (saisie.serviceId === SERVICE_AUTRE) {
    if (saisie.serviceLibre) {
      identite.serviceRef = empreinte(
        secret,
        `service-libre:${normalise(saisie.serviceLibre)}`
      );
    }
  } else if (saisie.serviceId) {
    identite.serviceRef = empreinte(secret, `service:${saisie.serviceId}`);
  }

  // Prescripteur (réel, ou identité libre si hors liste / exercice libéral·CNAM).
  if (saisie.prescripteurId && saisie.prescripteurId !== PRESCRIPTEUR_HORS_LISTE) {
    identite.prescripteurRef = empreinte(
      secret,
      `prescripteur:${saisie.prescripteurId}`
    );
  } else if (saisie.nom && saisie.prenom) {
    identite.prescripteurRef = refIdentite(secret, saisie.nom, saisie.prenom);
  }

  return identite;
}
