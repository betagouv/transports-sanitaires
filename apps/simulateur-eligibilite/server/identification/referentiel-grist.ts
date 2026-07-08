// Implémentation `Referentiel` au-dessus de l'API REST Grist.
//
// Voir docs/architecture/identification.md — ADR-5 & §5. Ce module vit côté
// serveur uniquement : il détient la clé Grist (jamais exposée au navigateur) et
// ne renvoie que des données filtrées (les noms de prescripteurs seulement pour
// le service demandé, jamais l'annuaire complet).
//
// Modèle Grist (identifiants de tables/colonnes réels, assainis par Grist) :
//   Etablissements   : Id2 (Int, « Id » métier), Nom (Text)
//   Services_Unites  : Id2, Nom, Etablissement (Ref:Etablissements)
//   Prescripteurs    : Id2, Nom, Prenom, Service_Unite (Ref:Services_Unites)
//
// Les identifiants opaques du contexte (`etabId`/`serviceId`/`prescripteurId`)
// sont la colonne **Id2** (choix produit). Les colonnes de référence stockent le
// **rowId interne Grist** de la ligne cible, pas son Id2 : on résout donc Id2 →
// rowId avant de filtrer les enfants.

import type {
  Etablissement,
  Prescripteur,
  Referentiel,
  Service,
} from "../../shared/referentiel.ts";

const TABLE = {
  etablissements: "Etablissements",
  services: "Services_Unites",
  prescripteurs: "Prescripteurs",
} as const;

const COL = {
  id: "Id2",
  nom: "Nom",
  prenom: "Prenom",
  refEtablissement: "Etablissement",
  refService: "Service_Unite",
} as const;

type GristRecord = { id: number; fields: Record<string, unknown> };

export type GristConfig = {
  /** Base API du doc, ex. https://…/api/docs/<docId> */
  docUrl: string;
  apiKey: string;
};

const str = (v: unknown): string =>
  typeof v === "string" ? v.trim() : v == null ? "" : String(v);

export function createGristReferentiel({
  docUrl,
  apiKey,
}: GristConfig): Referentiel {
  const base = docUrl.replace(/\/$/, "");

  async function records(
    table: string,
    filter?: Record<string, Array<string | number>>
  ): Promise<GristRecord[]> {
    const url = new URL(`${base}/tables/${table}/records`);
    if (filter) url.searchParams.set("filter", JSON.stringify(filter));
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`Grist ${table} → HTTP ${res.status}`);
    }
    const body = (await res.json()) as { records?: GristRecord[] };
    return body.records ?? [];
  }

  // Résout un Id2 métier vers le rowId interne Grist de la table donnée.
  async function rowIdForId(table: string, id: string): Promise<number | null> {
    const recs = await records(table, { [COL.id]: [Number(id)] });
    return recs[0]?.id ?? null;
  }

  return {
    async getEtablissements(): Promise<Etablissement[]> {
      return (await records(TABLE.etablissements))
        .map((r) => ({ id: str(r.fields[COL.id]), libelle: str(r.fields[COL.nom]) }))
        .filter((e) => e.id && e.libelle);
    },

    async getServices(etabId: string): Promise<Service[]> {
      const rowId = await rowIdForId(TABLE.etablissements, etabId);
      if (rowId == null) return [];
      return (await records(TABLE.services, { [COL.refEtablissement]: [rowId] }))
        .map((r) => ({ id: str(r.fields[COL.id]), libelle: str(r.fields[COL.nom]) }))
        .filter((s) => s.id && s.libelle);
    },

    async getPrescripteurs(serviceId: string): Promise<Prescripteur[]> {
      const rowId = await rowIdForId(TABLE.services, serviceId);
      if (rowId == null) return [];
      return (await records(TABLE.prescripteurs, { [COL.refService]: [rowId] }))
        .map((r) => ({
          id: str(r.fields[COL.id]),
          libelle: `${str(r.fields[COL.prenom])} ${str(r.fields[COL.nom])}`.trim(),
        }))
        .filter((p) => p.id && p.libelle);
    },
  };
}
