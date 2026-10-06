// Implémentation `Referentiel` côté navigateur : appelle l'API same-origin
// exposée par le backend (voir docs/knowledge/adr/identification.md — ADR-5).
// Aucun secret, aucun CORS (même origine). Le snapshot factice reste le défaut
// des tests et du dev sans backend (voir shared/referentiel.ts).

import type {
  Etablissement,
  Referentiel,
  Service,
} from "../../shared/referentiel";

export const referentielHttp: Referentiel = {
  listerEtablissements: () => recuperer<Etablissement[]>("/api/etablissements"),
  listerServices: (etabId) =>
    recuperer<Service[]>(`/api/services?etabId=${encoder(etabId)}`),
};

// ---- implémentation ----

async function recuperer<T>(chemin: string): Promise<T> {
  const response = await fetch(chemin);
  if (!response.ok) throw new Error(`API ${chemin} → HTTP ${response.status}`);
  return (await response.json()) as T;
}

function encoder(valeur: string): string {
  return encodeURIComponent(valeur);
}
