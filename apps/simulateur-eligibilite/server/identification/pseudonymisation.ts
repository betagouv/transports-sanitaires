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
import {
  ETAB_NON_RATTACHE,
  PRESCRIPTEUR_HORS_LISTE,
  SERVICE_AUTRE,
  type Selection,
} from "../../shared/selection.ts";

/** Pseudonyme stable, non réversible sans le secret (128 bits, base64url). */
export function pseudonymise(secret: string, value: string): string {
  return createHmac("sha256", secret)
    .update(value)
    .digest()
    .subarray(0, 16)
    .toString("base64url");
}

// Normalise un texte libre avant HMAC pour que des saisies quasi identiques
// (casse, espaces) tombent dans le même « bucket ».
const normalise = (s: string): string => s.trim().replace(/\s+/g, " ").toLowerCase();

// Ref d'identité à partir d'un nom/prénom libres. HMAC du texte normalisé —
// jamais le nom en clair (invariant PII, ADR-4 / R-6).
const identiteRef = (secret: string, nom: string, prenom: string): string =>
  pseudonymise(secret, `identite:${normalise(nom)}|${normalise(prenom)}`);

/**
 * Construit le contexte pseudonymisé selon la branche d'identification. Les valeurs
 * sont préfixées par leur nature (`etab:`, `categorie:`, `service:`, …) pour éviter
 * toute collision entre un id de référentiel et un texte libre. Certaines refs sont
 * absentes selon la branche (contexte à refs optionnelles).
 */
export function buildContexte(secret: string, sel: Selection): Contexte {
  const ctx: Contexte = { v: CONTEXTE_VERSION };

  // Établissement (ou catégorie d'exercice si non rattaché).
  if (sel.etabId === ETAB_NON_RATTACHE) {
    if (sel.categorie) ctx.etabRef = pseudonymise(secret, `categorie:${sel.categorie}`);
  } else if (sel.etabId) {
    ctx.etabRef = pseudonymise(secret, `etab:${sel.etabId}`);
  }

  // Service (réel ou libre).
  if (sel.serviceId === SERVICE_AUTRE) {
    if (sel.serviceLibre) {
      ctx.serviceRef = pseudonymise(secret, `service-libre:${normalise(sel.serviceLibre)}`);
    }
  } else if (sel.serviceId) {
    ctx.serviceRef = pseudonymise(secret, `service:${sel.serviceId}`);
  }

  // Prescripteur (réel, ou identité libre si hors liste / exercice libéral·CNAM).
  if (sel.prescripteurId && sel.prescripteurId !== PRESCRIPTEUR_HORS_LISTE) {
    ctx.prescripteurRef = pseudonymise(secret, `prescripteur:${sel.prescripteurId}`);
  } else if (sel.nom && sel.prenom) {
    ctx.prescripteurRef = identiteRef(secret, sel.nom, sel.prenom);
  }

  return ctx;
}
