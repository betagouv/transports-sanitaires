// Client de l'API `POST /api/rattachement` : déclare au serveur un service saisi
// sous « Autre », pour qu'il l'ajoute au référentiel Grist. Same-origin, aucun
// CORS.
//
// La déclaration part **sans attente** : l'utilisateur entre dans le simulateur
// sans dépendre de Grist, et un échec ne coûte que l'ajout au référentiel, qui
// était déjà best-effort côté serveur.

import type { RattachementSaisi } from "../../shared/rattachement-saisi";

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
