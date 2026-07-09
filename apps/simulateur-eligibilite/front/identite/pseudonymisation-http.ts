// Client de l'API `POST /api/identite-pseudonymisee` : convertit l'identité saisie
// en identité pseudonymisée (refs HMAC), calculée **côté serveur** (le secret n'est
// jamais exposé au front). Same-origin, aucun CORS.
//
// En cas d'échec (API indisponible), renvoie `null` : l'identification a bien eu
// lieu, on entre dans le simulateur, mais le suivi analytics par prescripteur est
// perdu pour cette session (dégradation gracieuse — voir App.tsx).

import {
  estIdentitePseudonymisee,
  type IdentitePseudonymisee,
} from "../../shared/identite-pseudonymisee";
import type { IdentiteSaisie } from "../../shared/identite-saisie";

export async function pseudonymiserViaApi(
  saisie: IdentiteSaisie
): Promise<IdentitePseudonymisee | null> {
  try {
    const res = await fetch("/api/identite-pseudonymisee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saisie),
    });
    if (!res.ok)
      throw new Error(`/api/identite-pseudonymisee → HTTP ${res.status}`);
    const body: unknown = await res.json();
    return estIdentitePseudonymisee(body) ? body : null;
  } catch (err) {
    console.error("[simulateur] identité pseudonymisée indisponible:", err);
    return null;
  }
}
