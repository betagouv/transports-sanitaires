// Client de l'API `POST /api/contexte` : convertit la sélection d'identification
// en contexte pseudonymisé (refs HMAC), calculé **côté serveur** (le secret n'est
// jamais exposé au front). Same-origin, aucun CORS.
//
// En cas d'échec (API indisponible), renvoie `null` : l'identification a bien eu
// lieu, on entre dans le simulateur, mais le suivi analytics par prescripteur est
// perdu pour cette session (dégradation gracieuse — voir App.tsx).

import { isContexte, type Contexte } from "../../shared/contexte";
import type { Selection } from "../../shared/selection";

export async function fetchContexte(sel: Selection): Promise<Contexte | null> {
  try {
    const res = await fetch("/api/contexte", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sel),
    });
    if (!res.ok) throw new Error(`/api/contexte → HTTP ${res.status}`);
    const body: unknown = await res.json();
    return isContexte(body) ? body : null;
  } catch (err) {
    console.error("[simulateur] contexte indisponible:", err);
    return null;
  }
}
