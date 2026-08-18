// Implémentation `Referentiel` côté navigateur : appelle l'API same-origin
// exposée par le backend (voir docs/architecture/identification.md — ADR-5).
// Aucun secret, aucun CORS (même origine). Le snapshot factice reste le défaut
// des tests et du dev sans backend (voir shared/referentiel.ts).

import type {
  Etablissement,
  Prescripteur,
  Referentiel,
  Service,
} from "../../shared/referentiel";

export const referentielHttp: Referentiel = {
  getEtablissements: () => get<Etablissement[]>("/api/etablissements"),
  getServices: (etabId) =>
    get<Service[]>(`/api/services?etabId=${encoder(etabId)}`),
  getPrescripteurs: (serviceId) =>
    get<Prescripteur[]>(`/api/prescripteurs?serviceId=${encoder(serviceId)}`),
};

// ---- implémentation ----

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`API ${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

function encoder(valeur: string): string {
  return encodeURIComponent(valeur);
}
