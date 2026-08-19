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
  listerEtablissements: () => recuperer<Etablissement[]>("/api/etablissements"),
  listerServices: (etabId) =>
    recuperer<Service[]>(`/api/services?etabId=${encoder(etabId)}`),
  listerPrescripteurs: (serviceId) =>
    recuperer<Prescripteur[]>(
      `/api/prescripteurs?serviceId=${encoder(serviceId)}`,
    ),
};

// ---- implémentation ----

async function recuperer<T>(chemin: string): Promise<T> {
  const reponse = await fetch(chemin);
  if (!reponse.ok) throw new Error(`API ${chemin} → HTTP ${reponse.status}`);
  return (await reponse.json()) as T;
}

function encoder(valeur: string): string {
  return encodeURIComponent(valeur);
}
