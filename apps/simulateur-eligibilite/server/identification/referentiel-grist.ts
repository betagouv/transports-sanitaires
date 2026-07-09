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
import {
  ETAB_NON_RATTACHE,
  normalise,
  PRESCRIPTEUR_HORS_LISTE,
  SERVICE_AUTRE,
  type Categorie,
  type Selection,
} from "../../shared/selection.ts";

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
  origine: "Origine",
} as const;

// Marqueur écrit dans la colonne `Origine` des lignes issues du formulaire (par
// opposition aux lignes saisies par l'admin), pour tri/validation ultérieure.
const ORIGINE_FORMULAIRE = "formulaire";

// Branche « non rattaché » : le porteur a créé dans Grist un établissement
// « Libéral / CNAM » (Id2 ci-dessous) et deux services porteurs. Cet établissement est
// la contrepartie de l'option « Je ne suis pas rattaché à un établissement de santé » :
// il ne doit **jamais** apparaître dans la liste des établissements (il n'accueille que
// les prescripteurs non rattachés).
const ETAB_ID_NON_RATTACHE = "2";

// On rattache le prescripteur libre au service porteur selon la catégorie d'exercice
// (Id2 métier des services, tous deux enfants de l'établissement ci-dessus).
const SERVICE_ID_PAR_CATEGORIE: Record<Categorie, string> = {
  cnam: "2",
  liberal: "3",
};

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

  // Crée une ligne et renvoie son rowId interne Grist.
  async function create(
    table: string,
    fields: Record<string, unknown>
  ): Promise<number> {
    const res = await fetch(`${base}/tables/${table}/records`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ records: [{ fields }] }),
    });
    if (!res.ok) {
      throw new Error(`Grist ${table} POST → HTTP ${res.status}`);
    }
    const body = (await res.json()) as { records?: Array<{ id: number }> };
    const id = body.records?.[0]?.id;
    if (id == null) throw new Error(`Grist ${table} POST : aucun id renvoyé`);
    return id;
  }

  // Prochain Id2 métier libre de la table (max + 1). Les lignes du formulaire sont
  // ainsi visibles immédiatement dans les listes (le read-path filtre sur Id2 non nul).
  async function nextId2(table: string): Promise<number> {
    const recs = await records(table);
    const max = recs.reduce(
      (m, r) => Math.max(m, Number(r.fields[COL.id]) || 0),
      0
    );
    return max + 1;
  }

  // Réutilise le service homonyme (Nom normalisé) sous l'établissement, sinon le crée.
  async function assurerService(
    etabRowId: number,
    nom: string
  ): Promise<number> {
    const cible = normalise(nom);
    const existants = await records(TABLE.services, {
      [COL.refEtablissement]: [etabRowId],
    });
    const deja = existants.find((r) => normalise(str(r.fields[COL.nom])) === cible);
    if (deja) return deja.id;
    return create(TABLE.services, {
      [COL.id]: await nextId2(TABLE.services),
      [COL.nom]: nom.trim(),
      [COL.refEtablissement]: etabRowId,
      [COL.origine]: ORIGINE_FORMULAIRE,
    });
  }

  // Réutilise le prescripteur homonyme (Nom+Prénom normalisés) du service, sinon le crée.
  async function assurerPrescripteur(
    serviceRowId: number,
    nom: string,
    prenom: string
  ): Promise<number> {
    const cn = normalise(nom);
    const cp = normalise(prenom);
    const existants = await records(TABLE.prescripteurs, {
      [COL.refService]: [serviceRowId],
    });
    const deja = existants.find(
      (r) =>
        normalise(str(r.fields[COL.nom])) === cn &&
        normalise(str(r.fields[COL.prenom])) === cp
    );
    if (deja) return deja.id;
    return create(TABLE.prescripteurs, {
      [COL.id]: await nextId2(TABLE.prescripteurs),
      [COL.nom]: nom.trim(),
      [COL.prenom]: prenom.trim(),
      [COL.refService]: serviceRowId,
      [COL.origine]: ORIGINE_FORMULAIRE,
    });
  }

  return {
    async getEtablissements(): Promise<Etablissement[]> {
      return (await records(TABLE.etablissements))
        .map((r) => ({ id: str(r.fields[COL.id]), libelle: str(r.fields[COL.nom]) }))
        // On masque l'établissement « Libéral / CNAM » : c'est le support de l'option
        // « non rattaché », pas un établissement sélectionnable.
        .filter((e) => e.id && e.libelle && e.id !== ETAB_ID_NON_RATTACHE);
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

    // Écrit les saisies **libres** dans le référentiel (colonne `Origine=formulaire`).
    // Idempotent (dédup sur Nom/Prénom normalisés) ; ne fait rien pour une sélection
    // issue des listes. Voir docs/specs/enrichissement-referentiel-saisies-libres.md.
    async enrichirDepuisSaisie(sel: Selection): Promise<void> {
      // Service « autre » : service libre sous l'établissement réel + prescripteur.
      if (sel.serviceId === SERVICE_AUTRE) {
        if (!sel.serviceLibre || !sel.nom || !sel.prenom) return;
        const etabRowId = await rowIdForId(TABLE.etablissements, sel.etabId);
        if (etabRowId == null) return;
        const serviceRowId = await assurerService(etabRowId, sel.serviceLibre);
        await assurerPrescripteur(serviceRowId, sel.nom, sel.prenom);
        return;
      }

      // Non rattaché : prescripteur sous le service libéral/CNAM existant.
      if (sel.etabId === ETAB_NON_RATTACHE) {
        if (!sel.categorie || !sel.nom || !sel.prenom) return;
        const serviceRowId = await rowIdForId(
          TABLE.services,
          SERVICE_ID_PAR_CATEGORIE[sel.categorie]
        );
        if (serviceRowId == null) return;
        await assurerPrescripteur(serviceRowId, sel.nom, sel.prenom);
        return;
      }

      // Prescripteur hors liste : prescripteur sous le service réel.
      if (sel.prescripteurId === PRESCRIPTEUR_HORS_LISTE) {
        if (!sel.serviceId || !sel.nom || !sel.prenom) return;
        const serviceRowId = await rowIdForId(TABLE.services, sel.serviceId);
        if (serviceRowId == null) return;
        await assurerPrescripteur(serviceRowId, sel.nom, sel.prenom);
        return;
      }

      // Sinon : sélection issue des listes → rien à écrire.
    },
  };
}
