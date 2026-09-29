// Client de l'API `POST /api/rattachement-pseudonymise` : convertit le rattachement
// saisi en rattachement pseudonymisé (refs HMAC), calculé **côté serveur** (le secret n'est
// jamais exposé au front). Same-origin, aucun CORS.
//
// En cas d'échec (API indisponible), renvoie `null` : le rattachement a bien eu
// lieu, on entre dans le simulateur, mais le suivi analytics par service est
// perdu pour cette session (dégradation gracieuse — voir App.tsx).

import {
  estRattachementPseudonymise,
  type RattachementPseudonymise,
} from "../../shared/rattachement-pseudonymise";
import type { RattachementSaisi } from "../../shared/rattachement-saisi";

export async function pseudonymiserViaApi(
  saisie: RattachementSaisi,
): Promise<RattachementPseudonymise | null> {
  try {
    const res = await fetch("/api/rattachement-pseudonymise", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(saisie),
    });
    if (!res.ok)
      throw new Error(`/api/rattachement-pseudonymise → HTTP ${res.status}`);
    const body: unknown = await res.json();
    return estRattachementPseudonymise(body) ? body : null;
  } catch (err) {
    console.error("[simulateur] rattachement pseudonymisé indisponible:", err);
    return null;
  }
}
