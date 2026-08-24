// Transforme l'identité saisie en refs à sens unique, pour l'API
// `POST /api/identite-pseudonymisee`. Voir l'ADR-4 de
// docs/architecture/identification.md.

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
 * Pseudonymise l'identité saisie selon la branche d'identification. Le
 * prescripteur, l'établissement et le service partent en pseudonymes à sens unique,
 * jamais en identifiant brut ni en nom. Le secret reste côté serveur, et c'est lui
 * qui rend le jeton non réversible et non forgeable. Le front garde ces refs en
 * mémoire de session et les forwarde à Matomo, voir analytics.md.
 *
 * Les valeurs sont préfixées par leur nature, `etab:`, `service:` et les autres,
 * pour éviter toute collision entre un id de référentiel et un texte libre.
 * Certaines refs sont absentes selon la branche, l'identité pseudonymisée ayant des
 * refs optionnelles.
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
  const prescripteurRef = refPrescripteur(secret, saisie, enClair);
  if (prescripteurRef) identite.prescripteurRef = prescripteurRef;
  return identite;
}

// Le prescripteur est référencé par son identifiant de référentiel, ou par son nom
// et son prénom s'il s'est déclaré hors liste.
function refPrescripteur(
  secret: string,
  saisie: IdentiteSaisie,
  enClair: boolean,
): string | undefined {
  const { prescripteurId, nom, prenom } = saisie;
  if (prescripteurId && prescripteurId !== PRESCRIPTEUR_HORS_LISTE) {
    return empreinte(secret, `prescripteur:${prescripteurId}`, enClair);
  }
  if (nom && prenom) return refIdentite(secret, nom, prenom, enClair);
  return undefined;
}

/**
 * Empreinte stable, non réversible sans le secret, sur 128 bits en base64url. Elle
 * est exportée pour que les tests recalculent une ref attendue sans rejouer la
 * branche entière.
 *
 * Le mode debug `enClair`, piloté par `PSEUDONYMISATION_EN_CLAIR` et réservé à la
 * phase de test, renvoie la valeur préfixée en clair au lieu du HMAC, pour lire
 * directement les refs dans Matomo. ⚠️ Il révèle des données brutes, dont le nom et
 * le prénom normalisés : à ne jamais activer en production.
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

// ---- implémentation ----

// Ref d'identité à partir d'un nom et d'un prénom libres. C'est le HMAC du texte
// normalisé, jamais le nom en clair, ce qu'imposent l'invariant PII de l'ADR-4 et
// le risque R-6. Le mode debug `enClair` est la seule exception.
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
