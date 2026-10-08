// Déclare au serveur un service saisi sous « Autre » (`POST /api/rattachement`).
// Le serveur l'ajoute au référentiel Grist.
//
// L'appel part sans attendre la réponse. L'utilisateur entre dans le simulateur
// même si Grist ne répond pas.

import type { RattachementSaisi } from "../../../shared/rattachement-saisi";

export function declarerViaApi(saisie: RattachementSaisi): void {
  fetch("/api/rattachement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(saisie),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`/api/rattachement → HTTP ${res.status}`);
    })
    .catch((err: unknown) => {
      console.error("[simulateur] déclaration du rattachement échouée:", err);
    });
}
