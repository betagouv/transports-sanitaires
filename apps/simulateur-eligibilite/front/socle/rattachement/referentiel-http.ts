// Le référentiel côté navigateur : il appelle l'API du backend, sur la même
// origine. Voir docs/knowledge/adr/identification.md, ADR-5.

import type {
  Etablissement,
  Referentiel,
  Service,
} from "../../../shared/referentiel";

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
